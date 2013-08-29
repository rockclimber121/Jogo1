/**
 * Окно игры. Отдельный фрейм с игровым полем. Содержит методы по работе с ним.
 */
var GameWindow = {

    /**
     * Контрол для отображения номера текущего уровня.
     */
    controlChoosingLevel : undefined,

    /**
     * Контрол для отрисовки игрового поля.
     */
    canvas : undefined,

    /**
     * Все уровни игры в первоначальном формате.
     */
    Levels : [],

    /**
     * Текущий уровень. Его реальная объектная модель.
     */
    CurrentLevel : undefined,

    /**
     * Номер самого последнего доступного для прохождения уровня.
     */
    MaxLevelNumber : 1,

    /**
     * Настройки отображения ячеек.
     */
    cellOptions : {
        fillColor: 'transparent', // Фон.
        strokeWidth: 1, // Ширина границы.
        strokeColor: 'white' // Цвет границы.
    },

    /**
     * Настройки отображения стен между ячейками (стенкой считается непреодолимое препятсвие).
     */
    wallOptions : {
        width: 6, // Толщина стенки.
        color: 'black', // Цвет стенки.
        lineCap: 'round' // Тип наконечника линии (context.lineCap: butt, round, square).
    },

    /**
     * Графические ресурсы игрового поля.
     */
    imageResources : {
        enemy: "images/enemy.png", // Вражеский персонаж с силой 1.
        trappedEnemy: "images/trappedEnemy.png", // Вражеский персонаж с силой 1, застрявший в ловушке.
        enemy2: "images/enemy2.png", // Вражеский персонаж с силой 2.
        hero: "images/hero.png", // Герой.
        house: "images/house.png", // Дом - цель героя.
        snag: "images/snag.png", // Ловушка, на которой вражеский персонаж теряет игровые ходы.
        hell: "images/hell.png" // Фон игрового поля.
    },

    /**
     * Графика для игрового поля
     */
    images : undefined,

    /**
     * Перерисовывает поле в соответсвии с текущим значением ячеек cells.
     * @param {array} deletingMonsters удаляемые монстры, опциональный параметр.
     */
    Redraw : function(deletingMonsters) {
        if(deletingMonsters) {
            // Здесь перебираем удаленных монстров.
        }

        var context = GameWindow.canvas.getContext("2d");
        var cellOptions = this.cellOptions,
            images = this.images;

        // Рисуем фон.
        context.drawImage(this.images.hell, 0, 0);

        // Отрисовка изображения по центру ячейки.
        var drawImageInCell = function(cell, img) {
            var x = cell.X + (cell.Width - img.naturalWidth) / 2;
            var y = cell.Y + (cell.Height - img.naturalHeight) / 2;
            context.drawImage(img, x, y);
        };

        // Отрисовка ячейки.
        var drawCell = function(cell) {
            context.beginPath();

            context.fillStyle = cellOptions.fillColor;
            context.rect(cell.X, cell.Y, cell.Width, cell.Height);
            context.fill();

            context.lineWidth = cellOptions.strokeWidth;
            context.strokeStyle = cellOptions.strokeColor;
            context.stroke();

            if(cell.Place instanceof Trap)
                drawImageInCell(cell, images.snag);
            else if(cell.Place instanceof Home)
                drawImageInCell(cell, images.house);

            if(cell.Unit instanceof Hero) {
                drawImageInCell(cell, images.hero);
            }
            else if(cell.Unit instanceof Monster) {
                switch(cell.Unit.Power) {
                    case 2:
                        // рисуем монстра с силой 1.
                        drawImageInCell(cell, (cell.Unit.SkipTurns == 0) ? images.enemy : images.trappedEnemy);
                        break;
                    case 3:
                        // рисуем монстра с силой 2.
                        drawImageInCell(cell, images.enemy2);
                        break;
                }
            }
        };

        for(var i = 0; i < this.CurrentLevel.Cells.length; i++) {
            for(var j = 0; j < this.CurrentLevel.Cells[i].length; j++) {
                drawCell(this.CurrentLevel.Cells[i][j]);
            }
        }

        // Если есть дом вне поля, рисуем его.
        if(this.CurrentLevel.CellOuterHome)
            drawCell(this.CurrentLevel.CellOuterHome);

        // Рисуем стенки после всего, чтобы они были поверх.
        context.strokeStyle = this.wallOptions.color;
        context.lineWidth = this.wallOptions.width;
        context.lineCap = this.wallOptions.lineCap;

        for(i = 0; i < this.CurrentLevel.Cells.length; i++)
            for(j = 0; j < this.CurrentLevel.Cells[i].length; j++) {
                var cell = this.CurrentLevel.Cells[i][j];

                if(cell.RightWall) {
                    context.beginPath();
                    context.moveTo(cell.X + cell.Width, cell.Y);
                    context.lineTo(cell.X + cell.Width, cell.Y + cell.Height);
                    context.stroke();
                }

                if(cell.BottomWall) {
                    context.beginPath();
                    context.moveTo(cell.X, cell.Y + cell.Height);
                    context.lineTo(cell.X + cell.Width, cell.Y + cell.Height);
                    context.stroke();
                }
            }
    },

    /**
     * Отобразить окно с игровым полем.
     * @param {string} canvasId идентификатор полотна для отрисовки окна
     */
    Init : function(canvasId) {
        this.Levels = Levels.GetAllLevels();

        // Загружаем графические ресурсы.
        if (!this.images) {
            this.images = { loadQueue: Object.keys(GameWindow.imageResources).length };

            for (var imgKey in this.imageResources) {
                var img = new Image();

                img.onload = function() {
                    GameWindow.images.loadQueue--;
                };

                img.src = this.imageResources[imgKey];
                this.images[imgKey] = img;
            }
        }

        // Ждем окончания загрузки графических ресурсов.
        if(this.images.loadQueue > 0) {
            setTimeout(function () { GameWindow.Init(canvasId); }, 100);
            return;
        }

        this.canvas = document.getElementById(canvasId);

        Game.Init(canvasId);

        Game.LoseEvent = function() {
            GameWindow.LoadLevel(GameWindow.CurrentLevel.Number);
        };

        Game.WinEvent = function() {
            var numberNextLevel = GameWindow.CurrentLevel.Number + 1;
            if(numberNextLevel < GameWindow.Levels.length)
                GameWindow.LoadLevel(numberNextLevel);
            else
                alert('The End');
        };

        this.LoadCookies();
    },

    /**
     * Зарегистрировать обработчики для группы контролов отвечающих за выбор уровня.
     * @param {string} labelId идентификатор контрола для заголовка.
     * @param {string} controlId идентификатор контрола для ввода номера уровня.
     * @param {string} buttonId идентификатор кнопки для перехода на новый уровень.
     */
    RegisterLevelChoosingControl : function(labelId, controlId, buttonId) {
        $("#" + labelId).text("Level number of " + this.Levels.length);

        var controlChoosingLevel = $("#" + controlId);
        this.controlChoosingLevel = controlChoosingLevel;
        var button = $("#" + buttonId)[0];

        button.onclick = function() {
            var value = controlChoosingLevel.val() - 0;

            if(value > 0 && value <= GameWindow.Levels.length)
                GameWindow.LoadLevel(value - 1);
        };
    },

    /**
     * Загрузить новый уровень.
     * @param {number} levelNumber номер уровня, который необходимо загрузить.
     */
    LoadLevel : function(levelNumber) {
        // Очищаем поле.
        var context = this.canvas.getContext("2d");
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем фон.
        context.drawImage(this.images.hell, 0, 0);

        // Зачищаем объекты в игре.
        Game.hero = undefined;
        Game.monsters = [];
        Game.gameOver = false;

        // Пересоздаем уровень игры.
        this.CurrentLevel = new Level(this.Levels[levelNumber],
            levelNumber, { width : this.canvas.width, height : this.canvas.height });

        // Рисуем матрицу.
        GameWindow.Redraw();

        // Обновляем номер текущего уровня после его загрузки.
        this.controlChoosingLevel.val(levelNumber + 1);
        this.SaveCookies();
    },

    /**
     * Сохраняем все настройки в куки.
     */
    SaveCookies : function(){
        $.cookie.json = true;
        $.cookie('c', {
            currentLevel : GameWindow.CurrentLevel.Number
        }, { expires : 365 });
    },

    /**
     * Загружаем все настройки из куков.
     */
    LoadCookies : function(){
        $.cookie.json = true;
        var cookies = $.cookie("c");

        if(cookies){
            this.LoadLevel(cookies.currentLevel);
        }
    }
};
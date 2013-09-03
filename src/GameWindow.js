/**
 * Окно игры. Отдельный фрейм с игровым полем. Содержит методы по работе с ним.
 */
var GameWindow = {

    /**
     * Контрол для отображения номера текущего уровня.
     */
    controlChoosingLevel : undefined,

    /**
     * Полотно для отрисовки игрового поля.
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
     * Перерисовывает поле в соответсвии с текущим значением ячеек cells.
     * @param {array} deletingMonsters удаляемые монстры, опциональный параметр.
     */
    Redraw : function() {

        // Обновить объект в ячейке.
        var updateObject = function(imgName, unit) {
            var cell = unit.CurrentPosition;
            var img = collie.ImageManager.getImage(imgName);
            var x = cell.X + (cell.Width - img.naturalWidth) / 2;
            var y = cell.Y + (cell.Height - img.naturalHeight) / 2;

            var obj;
            var characters = this.charLayer.getChildren();
            for(var i = 0; i < characters.length; i++) {
                if(characters[i].get('unit') == unit){
                    obj = characters[i];
                    break;
                }
            }

            if (!obj)
                throw 'collie object not found';

            var context = this;
            obj.move(x, y, 400, function () {
                if (unit.deleted)
                    context.charLayer.removeChild(obj);
                else if (img != obj.getImage())
                    obj.setImage(imgName);
            });
        };

        // Отрисовка ячейки.
        var drawUnit = function(unit) {
            if(unit instanceof Hero){
                updateObject.call(this, 'hero', unit);
            }
            else if(unit instanceof Monster){
                switch(unit.Power) {
                    case 2:
                        // рисуем монстра с силой 1.
                        var imgName = (unit.SkipTurns == 0) ? 'enemy' : 'trappedEnemy';
                        updateObject.call(this, imgName, unit);
                        break;
                    case 3:
                        // рисуем монстра с силой 2.
                        updateObject.call(this, 'enemy2', unit);
                        break;
                }
            }
        };

        drawUnit.call(this, Game.hero);
        for(var i = 0; i < Game.monsters.length; i++)
            drawUnit.call(this, Game.monsters[i]);
    },

    /**
     * Отобразить окно с игровым полем.
     * @param {string} canvasId идентификатор полотна для отрисовки окна
     */
    Init : function(canvasId) {
        this.Levels = Levels.GetAllLevels();

        // Загружаем графические ресурсы.
        for (var imgKey in this.imageResources)
            collie.ImageManager.add(imgKey, this.imageResources[imgKey]);

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

    RenderLevel : function (fieldSize) {
        var renderer = collie.Renderer;

        // Очищаем всё полотно.
        renderer.removeAllLayer();

        // Фоновый слой (фон, стенки, другие статичные объекты).
        this.bkgdLayer = new collie.Layer({
            width : fieldSize.width,
            height : fieldSize.height
        });
        renderer.addLayer(this.bkgdLayer);

        // Слой персонажей (герой и монстры).
        this.charLayer = new collie.Layer({
            width: fieldSize.width,
            height: fieldSize.height
        });
        renderer.addLayer(this.charLayer);

        // Фоновое изображение игрового поля.
        new collie.DisplayObject({
            x : 0,
            y : 0,
            backgroundImage : "hell"
        }).addTo(this.bkgdLayer);

        renderer.load(this.canvas);
        renderer.start();

        // Добавить объект на слой.
        var displayObject = function(cell, imgName, unit) {
            var img = collie.ImageManager.getImage(imgName);
            var x = cell.X + (cell.Width - img.naturalWidth) / 2;
            var y = cell.Y + (cell.Height - img.naturalHeight) / 2;

            var obj = new collie.DisplayObject({
                x: x,
                y: y,
                backgroundImage: imgName,
                unit: unit // связанный с объектом collie персонаж игры
            });
            obj.addTo(unit ? this.charLayer : this.bkgdLayer);
        };

        // Отрисовка ячейки.
        var drawCell = function(cell) {

            // Обрамление ячейки.
            new collie.Rectangle({
                width: cell.Width,
                height: cell.Height,
                x: cell.X,
                y: cell.Y,
                fillColor: this.cellOptions.fillColor,
                strokeColor: this.cellOptions.strokeColor,
                strokeWidth: this.cellOptions.strokeWidth
            }).addTo(this.bkgdLayer);

            if(cell.Place instanceof Trap)
                displayObject.call(this, cell, 'snag');
            else if(cell.Place instanceof Home)
                displayObject.call(this, cell, 'house');

            if(cell.Unit instanceof Hero){
                displayObject.call(this, cell, 'hero', cell.Unit);
            }
            else if(cell.Unit instanceof Monster){
                switch(cell.Unit.Power) {
                    case 2:
                        // рисуем монстра с силой 1.
                        var imgName = (cell.Unit.SkipTurns == 0) ? 'enemy' : 'trappedEnemy';
                        displayObject.call(this, cell, imgName, cell.Unit);
                        break;
                    case 3:
                        // рисуем монстра с силой 2.
                        displayObject.call(this, cell, 'enemy2', cell.Unit);
                        break;
                }
            }
        };

        for(var i = 0; i < this.CurrentLevel.Cells.length; i++) {
            for(var j = 0; j < this.CurrentLevel.Cells[i].length; j++) {
                drawCell.call(this, this.CurrentLevel.Cells[i][j]);
            }
        }

        // Если есть дом вне поля, рисуем его.
        if(this.CurrentLevel.CellOuterHome)
            drawCell.call(this, this.CurrentLevel.CellOuterHome);

        // Нанесение стенок на игровое поле.
        for(i = 0; i < this.CurrentLevel.Cells.length; i++)
        for(j = 0; j < this.CurrentLevel.Cells[i].length; j++) {
            var cell = this.CurrentLevel.Cells[i][j];
            if (cell.RightWall || cell.BottomWall) {
                var wall = new collie.Polyline({
                    strokeColor: this.wallOptions.color,
                    strokeWidth: this.wallOptions.width,
                    lineCap: this.wallOptions.lineCap,
                    lineJoin: this.wallOptions.lineCap,
                    //dashArray : "-.",
                    closePath: false
                }).addTo(this.bkgdLayer);

                if (cell.RightWall) {
                    wall.moveTo(cell.X + cell.Width, cell.Y);
                    wall.lineTo(cell.X + cell.Width, cell.Y + cell.Height);
                }

                if (cell.BottomWall) {
                    wall.moveTo(cell.X, cell.Y + cell.Height);
                    wall.lineTo(cell.X + cell.Width, cell.Y + cell.Height);
                }
            }
        }
    },

    /**
     * Загрузить новый уровень.
     * @param {number} levelNumber номер уровня, который необходимо загрузить.
     */
    LoadLevel : function(levelNumber) {

        // Зачищаем объекты в игре.
        Game.hero = undefined;
        Game.monsters = [];
        Game.gameOver = false;

        // Пересоздаем уровень игры.
        var fieldSize = { width : $(this.canvas).width(), height : $(this.canvas).height() };
        this.CurrentLevel = new Level(this.Levels[levelNumber], levelNumber, fieldSize);

        // Рендеринг уровня.
        this.RenderLevel(fieldSize);

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
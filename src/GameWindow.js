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
     * Графические ресурсы игрового поля.
     */
    imageResources : {
        enemy: "images/enemy.png", // Вражеский персонаж с силой 1.
        trappedEnemy: "images/trappedEnemy.png", // Вражеский персонаж с силой 1, застрявший в ловушке.
        enemy2: "images/enemy2.png", // Вражеский персонаж с силой 2.
        hero: "images/hero.png", // Герой.
        house: "images/house.png", // Дом - цель героя.
        trap: "images/trap.png", // Ловушка, на которой вражеский персонаж теряет игровые ходы.
        background: "images/background.png", // Фон игрового поля.
        cell: "images/cell.png", // Фон пустой ячейки.
        tree: "images/tree.png", // Декорация: ёлка.
        wall: "images/wall.png", // Стена (препятствие).
        decor: "images/decor.png" // Прочие декорации.
    },

    /**
     * Перерисовывает поле в соответсвии с текущим значением ячеек cells.
     * @param {array} deletingMonsters удаляемые монстры, опциональный параметр.
     */
    Redraw : function() {

        // Обновить объект в ячейке.
        var updateObject = function(imgName, unit) {
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

            var cell = unit.CurrentPosition;
            var prevCell = obj.get('prevCell');
            obj.set('prevCell', $.extend({}, cell));

            if(prevCell.Col === cell.Col && prevCell.Row === cell.Row) {
                obj.setImage(imgName);
                return;
            }

            var oldAnimation = obj.get('animation');
            if(oldAnimation)
                oldAnimation.stop();

            // Поворот персонажа в зависимости от направления движения.
            // Номер строки со спрайтами в изображении.
            var spriteY;
            if(cell.Row > prevCell.Row)
                spriteY = 0;
            else if(cell.Col < prevCell.Col)
                spriteY = 1;
            else if(cell.Col > prevCell.Col)
                spriteY = 2;
            else if(cell.Row < prevCell.Row)
                spriteY = 3;

            if(spriteY != null)
                obj.set('spriteY', spriteY);

            // Анимация ходьбы персонажа.
            var objAnimation = collie.Timer.cycle(obj, "15fps", {
                from : 0,
                to : 2,
                loop : 0,
                set : "spriteX"
            });
            obj.set('animation', objAnimation);

            // Новая позиция объекта.
            var x = cell.X + (cell.Width - obj.get('width')) / 2,
                y = cell.Y + (cell.Height - obj.get('height')) / 2;

            // Анимированное перемещение персонажа.
            var context = this;
            obj.move(x, y, 100, function () {
                objAnimation.stop();
                obj.set('animation', null);
                obj.set('spriteX', 0);

                if (unit.deleted) {
                    context.charLayer.removeChild(obj);
                }
                else {
                    obj.setImage(imgName);
                }
            });

            if(unit instanceof Hero && cell.Place instanceof Home) {
                collie.Timer.transition(obj, 400, {
                    from : 1,
                    to : 0,
                    set : "opacity"
                });
            }
        };

        // Обновление объекта в ячейке.
        var drawUnit = function(unit) {
            if(unit instanceof Hero){
                updateObject.call(this, 'hero', unit);
            }
            else if(unit instanceof Monster){
                switch(unit.Power) {
                    case 2:
                        // рисуем монстра с силой 1.
                        var imgName = (unit.SkipTurns <= 1) ? 'enemy' : 'trappedEnemy';
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
            width : fieldSize.width,
            height: fieldSize.height,
            backgroundImage : "background",
            backgroundRepeat : "repeat"
        }).addTo(this.bkgdLayer);

        renderer.load(this.canvas);
        renderer.start();

        // Добавить объект в слой.
        var displayObject = function(cell, imgName, unit, width, height) {
            var img = collie.ImageManager.getImage(imgName);
            width = width || img.naturalWidth;
            height = height || img.naturalHeight;
            var x = cell.X + (cell.Width - width) / 2;
            var y = cell.Y + (cell.Height - height) / 2;

            var obj = new collie.DisplayObject({
                x: x,
                y: y,
                width: width,
                height: height,
                backgroundImage: imgName
            });

            if(unit) {
                obj.set('unit', unit); // связанный с объектом collie персонаж игры.
                obj.set('prevCell', $.extend({}, unit.CurrentPosition)); // запомним позицию.
            }

            obj.addTo(unit ? this.charLayer : this.bkgdLayer);
            return obj;
        };

        // Отрисовка ячейки.
        var drawCell = function(cell) {

            // Отрисовка пустой ячейки.
            new collie.Rectangle({
                width: cell.Width,
                height: cell.Height,
                x: cell.X,
                y: cell.Y,
                backgroundImage: 'cell'
            }).addTo(this.bkgdLayer);

            // Нанесение декораций внутри ячейки.
            // Берем случайное число из интервала 1..20.
            // Вероятность наличия декорации в ячейке - decorSpritesCount\20
            var decorNumber = Math.floor((Math.random()*20)+1);
            var decorSpritesCount = 6; // количество спрайтов в изображении.
            if(decorNumber < decorSpritesCount) {
                var decorObj = new collie.Rectangle({
                    width: cell.Width,
                    height: cell.Height,
                    x: cell.X,
                    y: cell.Y,
                    backgroundImage: 'decor'
                }).addTo(this.bkgdLayer);
                decorObj.set('spriteX', decorNumber);
            }

            // Нанесение декораций вне ячейки и игрового поля.
            var extraCells = [];
            var lastCol = this.CurrentLevel.Cells[0].length - 1;
            var lastRow = this.CurrentLevel.Cells.length - 1;

            if(cell.Col === 0)
                extraCells.push({x: cell.X - cell.Width, y: cell.Y});
            else if(cell.Col == lastCol)
                extraCells.push({x: cell.X + cell.Width, y: cell.Y});

            if(cell.Row === 0)
                extraCells.push({x: cell.X, y: cell.Y - cell.Height});
            else if(cell.Row == lastRow)
                extraCells.push({x: cell.X, y: cell.Y + cell.Height});

            if(cell.Col === 0 && cell.Row === 0)
                extraCells.push({x: cell.X - cell.Width, y: cell.Y - cell.Height});
            else if(cell.Col === lastCol && cell.Row === lastRow)
                extraCells.push({x: cell.X + cell.Width, y: cell.Y + cell.Height});
            else if(cell.Col === 0 && cell.Row === lastRow)
                extraCells.push({x: cell.X - cell.Width, y: cell.Y + cell.Height});
            else if(cell.Col === lastCol && cell.Row === 0)
                extraCells.push({x: cell.X + cell.Width, y: cell.Y - cell.Height});

            for(var i = 0; i < extraCells.length; i++){
                new collie.Rectangle({
                    width: cell.Width,
                    height: cell.Height,
                    x: extraCells[i].x,
                    y: extraCells[i].y,
                    backgroundImage: 'tree'
                }).addTo(this.bkgdLayer);
            }

            // Рендеринг основного содержимого ячейки.
            if(cell.Place instanceof Trap) {
                var obj = displayObject.call(this, cell, 'trap', null, 32, 50);
                collie.Timer.cycle(obj, "14fps", {
                    from : 0,
                    to : 2,
                    loop : 0,
                    set : "spriteX"
                });
            }
            else if(cell.Place instanceof Home)
                displayObject.call(this, cell, 'house');

            if(cell.Unit instanceof Hero){
                displayObject.call(this, cell, 'hero', cell.Unit, 32, 32);
            }
            else if(cell.Unit instanceof Monster){
                switch(cell.Unit.Power) {
                    case 2:
                        // рисуем монстра с силой 1.
                        var imgName = (cell.Unit.SkipTurns == 0) ? 'enemy' : 'trappedEnemy';
                        displayObject.call(this, cell, imgName, cell.Unit, 32, 32);
                        break;
                    case 3:
                        // рисуем монстра с силой 2.
                        displayObject.call(this, cell, 'enemy2', cell.Unit, 32, 32);
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
        var wallImg = collie.ImageManager.getImage('wall');
        for(i = 0; i < this.CurrentLevel.Cells.length; i++)
        for(j = 0; j < this.CurrentLevel.Cells[i].length; j++) {
            var cell = this.CurrentLevel.Cells[i][j];

            if (cell.RightWall) {
                new collie.Rectangle({
                    width: wallImg.naturalWidth,
                    height: wallImg.naturalHeight,
                    angle: 90,
                    x: cell.X + cell.Width / 2,
                    y: cell.Y + (cell.Height - wallImg.naturalHeight) / 2,
                    backgroundImage: 'wall'
                }).addTo(this.bkgdLayer);
            }

            if (cell.BottomWall) {
                new collie.Rectangle({
                    width: wallImg.naturalWidth,
                    height: wallImg.naturalHeight,
                    x: cell.X,
                    y: cell.Y + cell.Height - wallImg.naturalHeight / 2,
                    backgroundImage: 'wall'
                }).addTo(this.bkgdLayer);
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
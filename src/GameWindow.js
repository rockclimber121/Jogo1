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
    MaxLevelNumber : 200,

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
        decor: "images/decor.png", // Прочие декорации.
        heroBeaten: "images/heroBeaten.png", // "Драка" героя и врага - проигрыш.
        heroTrapped: "images/heroTrapped.png", // Герой оказался в ловушке (Trap) - проигрыш.
        enemyCombining: "images/enemyCombining.png" // Эффект при объединении монстров.
    },

    /**
     * Звуки в игре.
     */
    music : {},

    /**
     * Перерисовывает поле в соответсвии с текущим значением ячеек cells.
     * @param {function} onSuccess Callback-функция, уведомляющая об окончании перерисовки поля.
     *                             Вызывается после завершения последней анимации.
     */
    Redraw : function(onSuccess) {

        var redrawSuccessInfo = {
            // Количество анимаций в очереди (hero + monsters).
            // Подсчитывается, чтобы вызвать onSuccess после завершения последней анимации.
            animationQueue: 1 + Game.monsters.length,
            onSuccess: function() {
                if (onSuccess)
                    onSuccess();
            }
        };

        this._drawUnit.call(this, Game.hero, redrawSuccessInfo);
        for(var i = 0; i < Game.monsters.length; i++)
            this._drawUnit.call(this, Game.monsters[i], redrawSuccessInfo);
    },

    /**
     * Отобразить окно с игровым полем.
     * @param {string} canvasId идентификатор полотна для отрисовки окна
     * @param {string} labelId идентификатор контрола для заголовка.
     * @param {string} controlId идентификатор контрола для ввода номера уровня.
     * @param {string} buttonId идентификатор кнопки для перехода на новый уровень.
     */
    Init: function (canvasId, labelId, controlId, buttonId) {
        this.Levels = Levels.GetAllLevels();
        this.canvas = document.getElementById(canvasId);

        // Загружаем графические ресурсы.
        collie.ImageManager.add(this.imageResources, function () {
            // Графические ресурсы загружены.

            Game.Init(canvasId);

            Game.LoseEvent = function () {
                setTimeout(function () {
                    GameWindow.LoadLevel(GameWindow.CurrentLevel.Number);
                    Game.EndTurn();
                }, 2500);
            };

            Game.WinEvent = function () {
                setTimeout(function () {
                    var numberNextLevel = GameWindow.CurrentLevel.Number + 1;
                    if (numberNextLevel < GameWindow.Levels.length)
                        GameWindow.LoadLevel(numberNextLevel);
                    else
                        alert('The End');
                }, 2500);
            };

            GameWindow.RegisterLevelChoosingControl(labelId, controlId, buttonId);
            GameWindow.LoadCookies();
        });
    },

    /**
     * Зарегистрировать обработчики для группы контролов отвечающих за выбор уровня.
     * @param {string} labelId идентификатор контрола для заголовка.
     * @param {string} controlId идентификатор контрола для ввода номера уровня.
     * @param {string} buttonId идентификатор кнопки для перехода на новый уровень.
     */
    RegisterLevelChoosingControl: function (labelId, controlId, buttonId) {
        document.getElementById(labelId).textContent = "Level number of " + this.Levels.length;

        var controlChoosingLevel = document.getElementById(controlId);
        this.controlChoosingLevel = controlChoosingLevel;
        var button = document.getElementById(buttonId);

        button.onclick = function() {
            var value = controlChoosingLevel.value - 0;

            if(value > 0 && value <= GameWindow.MaxLevelNumber)
                GameWindow.LoadLevel(value - 1);
        };
    },

    /**
     * Рендеринг уровня.
     * @param {object} fieldSize Размер игрового поля.
     */
    RenderLevel : function (fieldSize) {
        var renderer = collie.Renderer;

        // Очищаем всё полотно.
        renderer.removeAllLayer();

        // Фоновый слой (фон, стенки, другие статичные объекты).
        var bkgdLayer = this.bkgdLayer = new collie.Layer({
            width : fieldSize.width,
            height : fieldSize.height
        });
        renderer.addLayer(this.bkgdLayer);

        // Запомнить последние данные о событии мыши,
        // чтобы по окончанию хода обновить выделение ячейки под курсором.
        var saveLastMouseEvent = function (e) {
            bkgdLayer.set('LastMouseEvent', e);
        };
        this.bkgdLayer.attach({
            mousemove : saveLastMouseEvent,
            mousedown : saveLastMouseEvent,
            mouseup : saveLastMouseEvent
        });
        Game.EndTurnEvent = function() {
            // Обновление выделения ячейки под курсором после завершения хода.
            var lastMouseEvent = bkgdLayer.get('LastMouseEvent');
            bkgdLayer.fireEvent('mousemove', lastMouseEvent);
        };

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

        for(var i = 0; i < this.CurrentLevel.Cells.length; i++) {
            for(var j = 0; j < this.CurrentLevel.Cells[i].length; j++) {
                this._drawCell.call(this, this.CurrentLevel.Cells[i][j]);
            }
        }

        // Если есть дом вне поля, рисуем его.
        if(this.CurrentLevel.CellOuterHome)
            this._drawCell.call(this, this.CurrentLevel.CellOuterHome);

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

        if (levelNumber + 1 > this.MaxLevelNumber)
            this.MaxLevelNumber = levelNumber + 1;

        // Зачищаем объекты в игре.
        Game.hero = undefined;
        Game.monsters = [];
        Game.gameOver = false;

        // Пересоздаем уровень игры.
        var fieldSize = { width: this.canvas.offsetWidth, height: this.canvas.offsetHeight };
        this.CurrentLevel = new Level(this.Levels[levelNumber], levelNumber, fieldSize);

        // Музыкальное сопровождение - фоновая музыка.
        var backMusic = this.music.background;
        if(backMusic)
            backMusic.pause();
        var trackNumber = Math.floor((Math.random()*5)+1); // random 1..5
        backMusic = new Audio("sounds/background" + trackNumber + ".mp3");
        backMusic.loop = true;
        backMusic.volume = 0;
        backMusic.play();
        this._animateVolume(backMusic, 0.2, 1500); // плавное увеличение громкости.
        this.music.background = backMusic;

        // Рендеринг уровня.
        this.RenderLevel(fieldSize);

        // Обновляем номер текущего уровня после его загрузки.
        this.controlChoosingLevel.value = levelNumber + 1;
        this.SaveCookies();
    },

    /**
     * Сохраняем все настройки в куки.
     */
    SaveCookies : function(){
        var value = GameWindow.CurrentLevel.Number + " " + GameWindow.MaxLevelNumber;
        document.cookie = "Jogo=" + value + "; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
    },

    /**
     * Загружаем все настройки из куков.
     */
    LoadCookies : function(){
        var getCookieItem = function (sKey) {
            return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
        };

        var value = getCookieItem("Jogo"),
            currentLevel,
            maxLevel;

        if (value) {
            value = value.split(" ");
            currentLevel = value[0];
            maxLevel = value[1];
        } else {
            currentLevel = 0;
            maxLevel = 0;
        }

        this.MaxLevelNumber = maxLevel;
        this.LoadLevel(currentLevel);
    },

    /**
     * Объединение монстров.
     * @param {object} cell Ячейка игрового поля, в которой происходит объединение.
     * @param {object} deletedUnitObj Collie-объект монстра, с которым объединяется другой монстр.
     * @private
     */
    _combineMonsters : function(cell, deletedUnitObj) {

        // Звук объединения монстров.
        var snd = new Audio("sounds/monster_combine.mp3");
        snd.play();

        // Объект для отображения эффекта объединения монстров.
        var combineObj = new collie.DisplayObject({
            x: cell.X,
            y: cell.Y,
            width: cell.Width,
            height: cell.Height,
            backgroundImage: 'enemyCombining'
        });
        combineObj.addTo(this.charLayer);

        // Воспроизведение анимации объединения монстров.
        collie.Timer.cycle(combineObj, "25fps", {
            from : 0,
            to : 5,
            loop : 1,
            set : "spriteX",
            onComplete : function () {
                GameWindow.charLayer.removeChild(combineObj);
            }
        });

        // Удаляем объект монстра, который был объединен с другим.
        this.charLayer.removeChild(deletedUnitObj);
    },

    /**
     * Обновить объект в ячейке.
     * @param {string} imgName Наименование графического ресурса для collie-объекта.
     * @param {object} unit Игровой персонаж.
     * @param {object} successInfo Информация о завершении обновления объекта.
     * @private
     */
    _updateObject : function(imgName, unit, successInfo) {
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
        obj.set('prevCell', GameWindow._extend({}, cell));

        if(prevCell.Col === cell.Col && prevCell.Row === cell.Row) {
            if (unit.deleted) {
                var oldSuccessFunc = successInfo.onSuccess;
                successInfo.onSuccess = function() {
                    GameWindow._combineMonsters(cell, obj);
                    oldSuccessFunc();
                };
            }
            else {
                obj.setImage(imgName);
            }

            if(--successInfo.animationQueue === 0)
                successInfo.onSuccess();

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

        // Звук перемещения персонажа.
        var walkSndFile = (unit instanceof Hero ? 'sounds/hero_walk.mp3' : 'sounds/monster_walk.mp3');
        if(!this.music[walkSndFile]) {
            var snd = new Audio(walkSndFile);
            snd.loop = true;
            this.music[walkSndFile] = snd;
        }

        var walkSnd = this.music[walkSndFile];
        walkSnd.play();

        // Анимированное перемещение персонажа.
        obj.move(x, y, 100, function () {
            walkSnd.pause();
            objAnimation.stop();
            obj.set('animation', null);
            obj.set('spriteX', 0);

            if (unit.deleted)
                GameWindow._combineMonsters(cell, obj);
            else
                obj.setImage(imgName);

            if(--successInfo.animationQueue === 0)
                successInfo.onSuccess();
        });

        if(unit instanceof Hero && cell.Place instanceof Home) {
            // Герой дошел до дома и выиграл.
            // Эффект "исчезание", когда герой двигается к дому.
            collie.Timer.transition(obj, 400, {
                from : 1,
                to : 0,
                set : "opacity"
            });

            GameWindow._animateVolume(GameWindow.music.background, 0, 500);
            var snd = new Audio('sounds/victory.mp3');
            snd.play();
        }
        else if(unit instanceof Hero || unit instanceof Monster) {
            var lose;

            // Проверим, встретились ли герой и монстр (проигрыш).
            // Если встретились, то отобразим клубы дыма над ними, типо драка.
            if(unit instanceof Monster && unit.CurrentPosition == Game.hero.CurrentPosition) {
                lose = 'heroBeaten';
            }
            else if(unit instanceof Hero) {
                for(var i = 0; i < Game.monsters.length; i++) {
                    if(unit.CurrentPosition == Game.monsters[i].CurrentPosition){
                        lose = 'heroBeaten';
                        break;
                    }
                }
            }

            // Проверим, не попал ли герой в ловушку (проигрыш).
            // Если так, то отобразим клубы огня над героем.
            if(!lose && Game.hero.CurrentPosition.Place instanceof Trap)
                lose = 'heroTrapped';

            if(lose) {
                successInfo.animationQueue++;

                // Объект "проигрыш" (клубы дыма или огня). Изначально скрыт (opacity: 0).
                var loseObj = new collie.DisplayObject({
                    x: x - (60 - 32) / 2,
                    y: y - (60 - 32) / 2,
                    width: 60,
                    height: 60,
                    opacity: 0,
                    backgroundImage: lose
                });
                loseObj.addTo(this.charLayer);

                // Делаем задержку, чтобы расстояние между героем и монстром сократилось до ~1\2 клетки.
                // Затем делаем видимым объект "проигрыш" (opacity -> 1) и анимируем его (спрайты).
                collie.Timer.queue()
                    .delay(function () {}, 400)
                    .transition(loseObj, 100, {
                        from : 0,
                        to : 1,
                        set : "opacity",
                        onComplete : function () {
                            setTimeout(function() {
                                if(--successInfo.animationQueue === 0)
                                    successInfo.onSuccess();
                            }, 700);
                        }
                    })
                    .cycle(loseObj,  "30fps", {
                        from : 1,
                        to : 7,
                        loop : 0,
                        set : "spriteX"
                    });

                GameWindow._animateVolume(GameWindow.music.background, 0, 500);
                var snd = new Audio('sounds/fail.mp3');
                snd.play();
            }
        }
    },

    /**
     * Обновление игрового персонажа в ячейке.
     * @param {object} unit Игровой персонаж.
     * @param {object} successInfo Информация о завершении обновления объекта.
     * @private
     */
    _drawUnit : function(unit, successInfo) {
        if(unit instanceof Hero){
            this._updateObject.call(this, 'hero', unit, successInfo);
        }
        else if(unit instanceof Monster){
            switch(unit.Power) {
                case 2:
                    // рисуем монстра с силой 1.
                    var imgName = (unit.SkipTurns <= 1) ? 'enemy' : 'trappedEnemy';
                    this._updateObject.call(this, imgName, unit, successInfo);
                    break;
                case 3:
                    // рисуем монстра с силой 2.
                    this._updateObject.call(this, 'enemy2', unit, successInfo);
                    break;
            }
        }
    },

    /**
     * Добавить объект в слой.
     * @param {object} cell Ячейка игрового поля.
     * @param {string} imgName Наименование графического ресурса.
     * @param {object} unit Игровой персонаж.
     * @param {number} width Ширина для создаваемого collie-объекта.
     * @param {number} height Высота для создаваемого collie-объекта.
     * @returns {collie.DisplayObject} Collie-объект, размещенный в слое.
     * @private
     */
    _displayObject : function(cell, imgName, unit, width, height) {
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
            obj.set('prevCell', GameWindow._extend({}, unit.CurrentPosition)); // запомним позицию.
        }

        obj.addTo(unit ? this.charLayer : this.bkgdLayer);
        return obj;
    },

    /**
     * Отрисовка ячейки.
     * @param {object} cell Ячейка игрового поля.
     * @private
     */
    _drawCell : function(cell) {

        // Отрисовка пустой ячейки.
        var cellObj = new collie.Rectangle({
            width: cell.Width,
            height: cell.Height,
            x: cell.X,
            y: cell.Y,
            backgroundImage: 'cell',
            useEvent: true // для поддержки метода _isPointInDisplayObjectBoundary (см. ниже).
        }).addTo(this.bkgdLayer);

        // Выделение ячейки при наведении указателя мыши на нее.
        // collie.DisplayObject не поддерживает событие mousemove. Поэтому подписываемся на весь слой.
        this.bkgdLayer.attach({
            mousemove : function (e) {
                // true, если объект находится под точкой [e.x, e.y].
                var cellHit = collie.LayerEvent.prototype._isPointInDisplayObjectBoundary(cellObj, e.x, e.y);

                var heroCell = Game.hero.CurrentPosition,
                    colDistance = Math.abs(heroCell.Col - cell.Col),
                    rowDistance = Math.abs(heroCell.Row - cell.Row);

                // true, если cell и heroCell находятся рядом.
                var nearHero = (colDistance + rowDistance === 1);

                var spriteX;
                if(Game.animating || Game.gameOver)
                    spriteX = 0;
                else if(cellHit && nearHero)
                    spriteX = e.event.which ? 2 : 1;
                else
                    spriteX = 0;

                cellObj.set('spriteX', spriteX);
            }
        });

        // Выделение ячейки при нажатии кнопки мыши.
        cellObj.attach({
            mousedown : function (e) {
                if(cellObj.get('spriteX'))
                    cellObj.set('spriteX', 2);

                var clickSnd = new Audio('sounds/click.mp3');
                clickSnd.volume = 0.3;
                clickSnd.play();
            },
            mouseup : function (e) {
                if(cellObj.get('spriteX'))
                    cellObj.set('spriteX', 1);
            }
        });

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
            var obj = this._displayObject.call(this, cell, 'trap', null, 32, 50);
            collie.Timer.cycle(obj, "14fps", {
                from : 0,
                to : 2,
                loop : 0,
                set : "spriteX"
            });
        }
        else if(cell.Place instanceof Home)
            this._displayObject.call(this, cell, 'house');

        if(cell.Unit instanceof Hero){
            this._displayObject.call(this, cell, 'hero', cell.Unit, 32, 32);
        }
        else if(cell.Unit instanceof Monster){
            switch(cell.Unit.Power) {
                case 2:
                    // рисуем монстра с силой 1.
                    var imgName = (cell.Unit.SkipTurns == 0) ? 'enemy' : 'trappedEnemy';
                    this._displayObject.call(this, cell, imgName, cell.Unit, 32, 32);
                    break;
                case 3:
                    // рисуем монстра с силой 2.
                    this._displayObject.call(this, cell, 'enemy2', cell.Unit, 32, 32);
                    break;
            }
        }
    },

    /**
     * Плавно изменить громкость объекта Audio.
     * @param {Audio} audio Аудиозапись.
     * @param {number} targetVolume Целевая громкость от 0 до 1.
     * @param {number} interval Суммарное время, за которое произойдет плавное изменение громкости.
     * @private
     */
    _animateVolume: function (audio, targetVolume, interval) {
        var volume = audio.volume,
            isFadeOut = (volume > targetVolume),
            sign = isFadeOut ? -1 : 1,
            deltaVolume = isFadeOut ? (volume - targetVolume) : (targetVolume - volume),
            stepVolume = 0.05,
            intervalStep = Math.round(interval / (deltaVolume / stepVolume));

        var intervalId = setInterval(function () {
            if (isFadeOut ? volume > targetVolume : volume < targetVolume) {
                volume += stepVolume * sign;
                volume = Number(volume.toFixed(2));
                audio.volume = volume;
            }
            else {
                clearInterval(intervalId);
                audio.volume = targetVolume;
            }
        }, intervalStep);
    },

    /**
     * Расширяет объект, объединяя свойства из объектов, переданных в аргументах после него.
     * @param {object} out Объект, который нужно расширить.
     * @param {...object} objects Объекты, свойства которых будут объединены с объектом out.
     * @return {object} Расширенный объект out.
     * @private
     */
    _extend : function(out) {
        out = out || {};

        for (var i = 1; i < arguments.length; i++) {
            if (!arguments[i])
                continue;

            for (var key in arguments[i]) {
                if (arguments[i].hasOwnProperty(key))
                    out[key] = arguments[i][key];
            }
        }

        return out;
    }
};
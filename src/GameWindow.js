/**
 * Окно игры. Отдельный фрейм с игровым полем. Содержит методы по работе с ним.
 */
var GameWindow = {
    canvas : undefined,

    /**
     * Настройки отображения ячеек
     */
    cellOptions : {
        size: 50, // Размер квадратной ячейки
        fillColor: 'transparent', // Фон
        strokeWidth: 1, // Ширина границы
        strokeColor: 'white' // Цвет границы
    },

    /**
     * Настройки отображения стен между ячейками (стенкой считается непреодолимое препятсвие)
     */
    wallOptions : {
        width: 6, // Толщина стенки
        color: 'black', // Цвет стенки
        lineCap: 'round' // Тип наконечника линии (context.lineCap: butt, round, square)
    },

    /**
     * Графические ресурсы игрового поля
     */
    imageResources : {
        enemy: "images/enemy.png", // вражеский персонаж с силой 1
        trappedEnemy: "images/trappedEnemy.png", // вражеский персонаж с силой 1, застрявший в ловушке
        enemy2: "images/enemy2.png", // вражеский персонаж с силой 2
        hero: "images/hero.png", // герой
        house: "images/house.png", // дом - цель героя
        snag: "images/snag.png", // ловушка, на которой вражеский персонаж теряет игровые ходы
        hell: "images/hell.png" // фон игрового поля
    },

    /**
     * Текущая ячейка в которой стоит герой. Формат ячейки описан в матрице ячеек.
     */
    currentCell : undefined,

    /**
     * Матрица ячеек. Формат одной ячейки: X - координате по горизонтали, Y - координата по вертикали,
     * Width - Ширина, Height - Высота, Value - значение соответвубщее тому, что находится в ячейке,
     * Monster - в этой ячейки стоит монстр число означает силу монстра,
     * RightWall - есть ли стенка справа, BottomWall - есть ли стенка снизу,
     * Row - номер строки ячейки в матрице, Col - номер столбца ячейки в матрице.
     */
    cells : undefined,

    /**
     * Графика для игрового поля
     */
    images : undefined,

    /**
     * Ячейка с домом.
     */
    cellOuterHome : undefined,

    /**
     * Перерисовывает поле в соответсвии с текущим значением ячеек cells.
     */
    Refresh : function(){
        var context = GameWindow.canvas.getContext("2d");
        var cellOptions = this.cellOptions,
            images = this.images;

        // рисуем фон
        context.drawImage(this.images.hell, 0, 0);

        // Отрисовка изображения по центру ячейки
        var drawImageInCell = function(cell, img) {
            var x = cell.X + (cellOptions.size - img.naturalWidth) / 2,
                y = cell.Y + (cellOptions.size - img.naturalHeight) / 2;
            context.drawImage(img, x, y);
        };

        // Отрисовка ячейки
        var drawCell = function(cell) {
            context.beginPath();

            context.fillStyle = cellOptions.fillColor;
            context.rect(cell.X, cell.Y, cell.Width, cell.Height);
            context.fill();

            context.lineWidth = cellOptions.strokeWidth;
            context.strokeStyle = cellOptions.strokeColor;
            context.stroke();

            // Рисуем ячейки
            switch (cell.Value) {
                case Levels.Empty:
                    // рисуем пустую клетку (очищаем её)
                    break;
                case Levels.Trap:
                case Levels.MonsterOnTrap:
                    // рисуем печать
                    drawImageInCell(cell, images.snag);
                    break;
                case Levels.Home:
                case Levels.MonsterOnHome:
                    // рисуем дом
                    drawImageInCell(cell, images.house);
                    break;
                case Levels.Hero:
                    // рисуем героя
                    drawImageInCell(cell, images.hero);
                    break;
            }

            if(cell.MonsterPower > 0) {
                switch(cell.MonsterPower) {
                    case 2:
                        // рисуем монстра с силой 1.
                        var monster = Game.GetMonsterInCell(cell);
                        drawImageInCell(cell, (monster.SkipTurns == 0) ? images.enemy : images.trappedEnemy);
                        break;
                    case 3:
                        // рисуем монстра с силой 2.
                        drawImageInCell(cell, images.enemy2);
                        break;
                }
            }
        };

        for(var i = 0; i < this.cells.length; i++){
            for(var j = 0; j < this.cells[i].length; j++){
                drawCell(this.cells[i][j]);
            }
        }

        // Если есть дом вне поля, рисуем его.
        if(this.cellOuterHome)
            drawCell(this.cellOuterHome);

        // Рисуем стенки после всего, чтобы они были поверх.
        context.strokeStyle = this.wallOptions.color;
        context.lineWidth = this.wallOptions.width;
        context.lineCap = this.wallOptions.lineCap;
        for(i = 0; i < this.cells.length; i++)
            for(j = 0; j < this.cells[i].length; j++){
                var cell = this.cells[i][j];

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
     * @param {object} level уровень. Структура описана в Levels.js
     * @param {string} caption заголовок формы
     * @param {string} canvasId идентификатор полотна для отрисовки окна
     */
    Show : function(level, caption, canvasId){
        var home = level["home"];
        var field = level["field"];

        // загружаем графические ресурсы
        if (!this.images) {
            this.images = {};
            for (var imgKey in this.imageResources) {
                var img = new Image();
                img.src = this.imageResources[imgKey];
                this.images[imgKey] = img;
            }
        }

        // очищаем поле
        var canvas = document.getElementById(canvasId);
        GameWindow.canvas = canvas;
        var context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);

        // рисуем фон
        context.drawImage(this.images.hell, 0, 0);

        // ШАГ 1. Подготавливаем все к отрисовке клеток и стенок.

        var center = { X: canvas.width/2, Y: canvas.height/2 };
        var countCellsInCol = (field.length + 1)/2;
        var countCellsInRow = (field[0].length + 1)/2;
        this.cells = [];

        for(var i = 0; i < countCellsInCol; i++){
            this.cells[i] = [];
            for(var j = 0; j < countCellsInRow; j++){
                var value = field[i*2][j*2];
                var valueForSet = value;

                if(value == Levels.Monster){
                    valueForSet = Levels.Empty;
                } else if(value == Levels.MonsterOnHome){
                    valueForSet = Levels.Home;
                } else if(value == Levels.MonsterOnTrap){
                    valueForSet == Levels.Trap;
                }

                //собираем ячейку
                var newCell = {
                    X: center.X + (j - (countCellsInRow/2|0)) * this.cellOptions.size,
                    Y: center.Y + (i - (countCellsInCol/2|0)) * this.cellOptions.size,
                    Width: this.cellOptions.size,
                    Height: this.cellOptions.size,
                    Value: valueForSet,
                    Row: i,
                    Col: j,
                    RightWall: false,
                    BottomWall: false,
                    LeftWall: false,
                    TopWall: false
                };

                // Если это монстр, то по умолчанию у него сила 2.
                if(value == Levels.Monster || value == Levels.MonsterOnHome || value == Levels.MonsterOnTrap)
                    newCell.MonsterPower = 2;

                // если ячеек в строке нечетное количество, то сдвигаем на пол ячейки по горизонтали
                if(countCellsInRow%2 == 1)
                    newCell.X -= this.cellOptions.size/2;

                // если ячеек в столбце нечетное количество, то сдвигаем на пол ячейки по вертикали
                if(countCellsInCol)
                    newCell.Y -= this.cellOptions.size/2;

                this.cells[i][j] = newCell;

                // Если это герой, то отметим сразу текущую ячейку.
                if (newCell.Value == Levels.Hero)
                    GameWindow.currentCell = newCell;
            }
        }

        this.cellOuterHome = undefined;

        // если дом вне поля, то запоминаем это.
        if(home[0] < 0 || home[1] < 0 || home[0] >= countCellsInCol || home[1] >= countCellsInRow){
            var x, y;

            if(home[1] < 0){
                x = this.cells[0][0].X - this.cellOptions.size;
            } else if(home[1] >= countCellsInRow) {
                x = this.cells[0][0].X + countCellsInRow * this.cellOptions.size;
            } else {
                x = this.cells[0][0].X + home[1] * this.cellOptions.size;
            }

            if(home[0] < 0){
                y = this.cells[0][0].Y - this.cellOptions.size;
            } else if(home[0] >= countCellsInCol) {
                y = this.cells[0][0].Y + countCellsInCol * this.cellOptions.size;
            } else {
                y = this.cells[0][0].Y + home[0] * this.cellOptions.size;
            }

            this.cellOuterHome = {
                X: x,
                Y: y,
                Width: this.cellOptions.size,
                Height: this.cellOptions.size,
                Value: Levels.Home,
                Row: home[0],
                Col: home[1],
                RightWall: false,
                BottomWall: false,
                LeftWall: false,
                TopWall: false
            };
        }

        // Шаг 2. Подготавливаем стенки для отрисовки.

        for(var i = 0; i < field.length; i++){
            for(var j = 0; j < field[i].length; j++){
                // Если это нечетная строчка, то стенки на четных позициях.
                // Если четная строчка, то стенки на нечетных позициях.
                // Проверка при делении по модулю 2 перевернута из-за того что индексы идут с 0.

                if(i%2 == 0 && j%2 == 1 && field[i][j] == 1){
                    this.cells[i/2][j/2 - 1/2].RightWall = true;

                    if(j != field[i].length - 1)
                        this.cells[i/2][j/2 + 1/2].LeftWall = true;
                }
                else if(i%2 == 1 && j%2 == 0 && field[i][j] == 1){
                    this.cells[i/2 - 1/2][j/2].BottomWall = true;

                    if(i != field.length - 1)
                        this.cells[i/2 + 1/2][j/2].TopWall = true;
                }
            }
        }

        // Шаг 3. Рисуем все.
        Game.Refresh();
        GameWindow.Refresh();
    },

    /**
     * Возвращает объект ячейки из матрицы находящуюся по указанным координатам.
     * @param x {int} Координата по оси X.
     * @param y {int} Координата по оси Y.
     * @returns {object|undefined} Ячейка из матрицы находящуюся по указанным координатам.
     * Если ячейка не будет найдена вернет undefined.
     */
    GetCellByCoordinates : function(x, y){
        // Сначала проверим не попали ли мы в дом, которыц вне матрицы.
        if(this.cellOuterHome){
            var deltaX = x - this.cellOuterHome.X;
            var deltaY = y - this.cellOuterHome.Y;

            if(deltaX > 0 && deltaX <= this.cellOptions.size && deltaY > 0 && deltaY <= this.cellOptions.size)
                return this.cellOuterHome;
        }

        // Определяем самый левый верхний угол матрицы.
        var startX = this.cells[0][0].X;
        var startY = this.cells[0][0].Y;

        var i = ((y - startY)/this.cellOptions.size)|0;
        var j = ((x - startX)/this.cellOptions.size)|0;

        if(i < this.cells.length && j < this.cells[i].length)
            return this.cells[i][j];
    },

    /**
     * Возвращает массив ячеек с мострами из текущей матрицы.
     * @returns {Array} Массив ячеек с мострами из текущей матрицы.
     */
    GetCellsWithMonsters : function(){
        var cellsWithMonsters = [];

        for(var i = 0; i < this.cells.length; i++){
            for(var j = 0; j < this.cells[i].length; j++){
                if(this.cells[i][j].MonsterPower > 0)
                    cellsWithMonsters.push(this.cells[i][j]);
            }
        }

        return cellsWithMonsters;
    }
};
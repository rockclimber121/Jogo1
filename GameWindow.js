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
        enemy: "enemy.png", // вражеский персонаж с силой 1
        enemy2: "enemy2.png", // вражеский персонаж с силой 2
        hero: "hero.png", // герой
        house: "house.png", // дом - цель героя
        snag: "snag.png", // препятствие, на котором вражеский персонаж потеряет игровые ходы
        hell: "hell.png" // фон игрового поля
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
     * Перерисовывает поле в соответсвии с текущим значением ячеек cells.
     * @param {jQuery} canvas полотно для отрисовки содержимого окна
     */
    Refresh : function(){
        var context = GameWindow.canvas.getContext("2d");
        var cellOptions = this.cellOptions;

        // рисуем фон
        context.drawImage(this.images.hell, 0, 0);

        // Отрисовка изображения по центру ячейки
        var drawImageInCell = function(cell, img) {
            var x = cell.X + (cellOptions.size - img.naturalWidth) / 2,
                y = cell.Y + (cellOptions.size - img.naturalHeight) / 2;
            context.drawImage(img, x, y);
        };

        for(var i = 0; i < this.cells.length; i++){
            for(var j = 0; j < this.cells[i].length; j++){
                var cell = this.cells[i][j];
                context.beginPath();

                context.fillStyle = this.cellOptions.fillColor;
                context.rect(cell.X, cell.Y, cell.Width, cell.Height);
                context.fill();

                context.lineWidth = this.cellOptions.strokeWidth;
                context.strokeStyle = this.cellOptions.strokeColor;
                context.stroke();

                // Рисуем ячейки
                switch (cell.Value) {
                    case Levels.Empty:
                        // рисуем пустую клетку (очищаем её)
                        break;
                    case Levels.Trap:
                    case Levels.MonsterOnTrap:
                        // рисуем печать
                        drawImageInCell(cell, this.images.snag);
                        break;
                    case Levels.Home:
                    case Levels.MonsterOnHome:
                        // рисуем дом
                        drawImageInCell(cell, this.images.house);
                        break;
                    case Levels.Hero:
                        // рисуем героя
                        drawImageInCell(cell, this.images.hero);
                        break;
                }

                if(cell.MonsterPower > 0) {
                    switch(cell.MonsterPower) {
                        case 2:
                            // рисуем монстра с силой 1.
                            drawImageInCell(cell, this.images.enemy);
                            break;
                        case 3:
                            // рисуем монстра с силой 2.
                            drawImageInCell(cell, this.images.enemy2);
                            break;
                    }
                }
            }
        }

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

        // TODO добавить дом в ячейки, если он был вне поля

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
        // Определяем самый левый верхний угол матрицы.
        var startX = this.cells[0][0].X;
        var startY = this.cells[0][0].Y;

        if(x < startX || y < startY)
            return;

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
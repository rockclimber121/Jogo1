/**
 * Класс для уровня игры.
 * @param level уровень в первоначальном формате.
 * @param number номер уровня.
 * @param fieldSize размер поля, необходим для проставления позиций ячеек.
 * @constructor
 */
Jogo.Level = function(level, number, fieldSize) {
    this.Number = number;            // Номер уровня.
    this.Cells = [];                 // Матрица ячеек игрового поля.
    this.CellOuterHome = undefined;  // Ячейка дома, если он находится вне поля.

    var home = level['home'];
    var field = level['field'];

    var center = { X: fieldSize.width/2, Y: fieldSize.height/2 };
    var countCellsInCol = (field.length + 1)/2;
    var countCellsInRow = (field[0].length + 1)/2;

    // ШАГ 1. Создаем матрицу клеток игрового поля.
    for(var i = 0; i < countCellsInCol; i++) {
        this.Cells[i] = [];
        for(var j = 0; j < countCellsInRow; j++) {
            var value = field[i*2][j*2];

            var newCell = new Jogo.Cell(center.X + (j - (countCellsInRow/2|0)) * this.DefaultCellSize,
                center.Y + (i - (countCellsInCol/2|0)) * this.DefaultCellSize,
                i, j);

            // Указываем что находится в ячейке.
            switch (value) {
                case Jogo.Levels.Trap:
                    newCell.Place = new Jogo.Trap(newCell);
                    break;

                case Jogo.Levels.Home:
                    newCell.Place = new Jogo.Home(newCell);
                    break;

                case Jogo.Levels.Hero:
                    newCell.Unit = new Jogo.Hero(newCell);
                    Jogo.Game.hero = newCell.Unit;
                    break;

                case Jogo.Levels.Monster:
                    newCell.Unit = new Jogo.Monster(newCell);
                    Jogo.Game.monsters.push(newCell.Unit);
                    break;

                case Jogo.Levels.MonsterOnTrap:
                    newCell.Unit = new Jogo.Monster(newCell);
                    newCell.Place = new Jogo.Trap(newCell);
                    Jogo.Game.monsters.push(newCell.Unit);
                    break;

                case Jogo.Levels.MonsterOnHome:
                    newCell.Unit = new Jogo.Monster(newCell);
                    newCell.Place = new Jogo.Home(newCell);
                    Jogo.Game.monsters.push(newCell.Unit);
                    break;

                default:
                    // Пустая ячейка. Ничего не указываем.
                    break;
            }

            // Если ячеек в строке нечетное количество, то сдвигаем на пол ячейки по горизонтали.
            if (countCellsInRow%2 == 1)
                newCell.X -= this.DefaultCellSize/2;

            // Если ячеек в столбце нечетное количество, то сдвигаем на пол ячейки по вертикали.
            if (countCellsInCol)
                newCell.Y -= this.DefaultCellSize/2;

            this.Cells[i][j] = newCell;
        }
    }

    // Если дом вне поля, то запоминаем это.
    if (home[0] < 0 || home[1] < 0 || home[0] >= countCellsInCol || home[1] >= countCellsInRow) {
        var x, y;

        if(home[1] < 0)
            x = this.Cells[0][0].X - this.DefaultCellSize;
        else if(home[1] >= countCellsInRow)
            x = this.Cells[0][0].X + countCellsInRow * this.DefaultCellSize;
        else
            x = this.Cells[0][0].X + home[1] * this.DefaultCellSize;

        if(home[0] < 0)
            y = this.Cells[0][0].Y - this.DefaultCellSize;
        else if(home[0] >= countCellsInCol)
            y = this.Cells[0][0].Y + countCellsInCol * this.DefaultCellSize;
        else
            y = this.Cells[0][0].Y + home[0] * this.DefaultCellSize;

        this.CellOuterHome = new Jogo.Cell(x, y, home[0], home[1]);
        this.CellOuterHome.Place = new Jogo.Home(this.CellOuterHome);
    }

    // Шаг 2. Актуализируем стенки в ячейках.
    for (i = 0; i < field.length; i++) {
        for (j = 0; j < field[i].length; j++) {
            // Если это нечетная строчка, то стенки на четных позициях.
            // Если четная строчка, то стенки на нечетных позициях.
            // Проверка при делении по модулю 2 перевернута из-за того что индексы идут с 0.

            if (i%2 == 0 && j%2 == 1 && field[i][j] == 1) {
                this.Cells[i/2][j/2 - 1/2].RightWall = true;

                if (j != field[i].length - 1)
                    this.Cells[i/2][j/2 + 1/2].LeftWall = true;
            }
            else if (i%2 == 1 && j%2 == 0 && field[i][j] == 1) {
                this.Cells[i/2 - 1/2][j/2].BottomWall = true;

                if (i != field.length - 1)
                    this.Cells[i/2 + 1/2][j/2].TopWall = true;
            }
        }
    }
}

/**
 * @type {number} Размер квадратной ячейки.
 */
Jogo.Level.prototype.DefaultCellSize = 50;

/**
 * Возвращает объект ячейки из матрицы находящуюся по указанным координатам.
 * @param x {int} Координата по оси X.
 * @param y {int} Координата по оси Y.
 * @returns {object|undefined} Ячейка из матрицы находящуюся по указанным координатам.
 * Если ячейка не будет найдена вернет undefined.
 */
Jogo.Level.prototype.GetCellByCoordinates = function (x, y) {
    // Сначала проверим не попали ли мы в дом, которыц вне матрицы.
    if (this.CellOuterHome) {
        var deltaX = x - this.CellOuterHome.X;
        var deltaY = y - this.CellOuterHome.Y;

        if (deltaX > 0 && deltaX <= this.DefaultCellSize && deltaY > 0 && deltaY <= this.DefaultCellSize)
            return this.CellOuterHome;
    }

    // Определяем самый левый верхний угол матрицы.
    var startX = this.Cells[0][0].X;
    var startY = this.Cells[0][0].Y;

    var i = ((y - startY)/this.DefaultCellSize)|0;
    var j = ((x - startX)/this.DefaultCellSize)|0;

    if (i >= 0 && j >= 0 && i < this.Cells.length && j < this.Cells[i].length)
        return this.Cells[i][j];
};

/**
 * Ячейка матрицы на игровом поле.
 * @param {number} x позиция ячейки по горизонтали.
 * @param {number} y позиция ячейки по вертикали.
 * @param {number} row номер строки в которой расположена ячейка.
 * @param {number} col номер столбца в котором расположена ячейка.
 * @constructor
 */
function Cell(x, y, row, col) {
    this.X = x;               // Координате по горизонтали.
    this.Y = y;               // Координата по вертикали.
    this.Width = 50;          // Ширина.
    this.Height = 50;         // Высота.
    this.Row = row;           // Номер строки ячейки в матрице.
    this.Col = col;           // Номер столбца ячейки в матрице.
    this.RightWall = false;   // Есть ли стенка справа.
    this.BottomWall = false;  // Есть ли стенка снизу.
    this.LeftWall = false;    // Есть ли стенка слева.
    this.TopWall = false;     // Есть ли стенка сверху.
    this.Unit = undefined;    // Юнит находящейся в ячейке (монстр или герой).
    this.Place = undefined;   // Что расположено в ячейке (ловушка или дом).
}

/**
 * Класс для создания экземпляра дома.
 * @param {Cell} cell ячейка в которой находится дом.
 */
function Home(cell) {
    this.CurrentPosition = cell;
}

/**
 * Класс для создания экземпляра ловушки.
 * @param {Cell} cell ячейка в которой находится ловушка.
 */
function Trap(cell) {
    this.CurrentPosition = cell;
}

/**
 * Класс для создания экземпляра героя.
 * @param {Cell} cell ячейка в которой изначально находится герой.
 */
function Hero(cell) {
    this.CurrentPosition = cell;
}

/**
 * Класс для создания экземпляра монстра.
 * @param {Cell} cell ячейка в которой изначально находится монстр.
 */
function Monster(cell) {
    this.CurrentPosition = cell;   // Текущая ячейка в которой находится монстр.
    this.Power = 2;                // Сила монстра которая определяет максимальное колличство шагов за раз.
    this.Steps = 2;                // Текущее количество оставшихся шагов.
    this.SkipTurns = 0;            // Количество ходов которые пропустит монстр.
    this.SkipTurnsEnabled = true;  // Будет ли монст пропускать ходы если попадет в ловушку.
}

/**
 * Объявление не экземплярной функци проставления силы монстра.
 * @param {Number} power сила монстра, которую необходимо проставить.
 */
Monster.prototype.SetPower = function(power) {
    if(this.Power < 3) {
        // Если монстр набирает силу больше двух, то его не остановить в ловушке.
        this.SkipTurnsEnabled = false;
    }

    this.Power = power;
}
function Cell(x, y, row, col){
    this.X = x;               // координате по горизонтали
    this.Y = y;               // координата по вертикали
    this.Width = 50;          // Ширина
    this.Height = 50;          // Высота
    this.Row = row;           // номер строки ячейки в матрице
    this.Col = col;           // мер столбца ячейки в матрице
    this.RightWall = false;   // есть ли стенка справа
    this.BottomWall = false;  // есть ли стенка снизу
    this.LeftWall = false;    // есть ли стенка слева
    this.TopWall = false;     // есть ли стенка сверху
    this.Unit = undefined;    // юнит находящейся в ячейке (монстр или герой)
    this.Place = undefined;   // что расположено в ячейке (ловушка или дом)
}

/**
 * Класс для создания экземпляра дома.
 * @param {Cell} cell ячейка в которой находится дом.
 */
function Home(cell){
    this.CurrentPosition = cell;
}

/**
 * Класс для создания экземпляра ловушки.
 * @param {Cell} cell ячейка в которой находится ловушка.
 */
function Trap(cell){
    this.CurrentPosition = cell;
}

/**
 * Класс для создания экземпляра героя.
 * @param {Cell} cell ячейка в которой изначально находится герой.
 */
function Hero(cell){
    this.CurrentPosition = cell;
}

/**
 * Класс для создания экземпляра монстра.
 * @param {Cell} cell ячейка в которой изначально находится монстр.
 */
function Monster(cell){
    this.CurrentPosition = cell;   // текущая ячейка в которой находится монстр,
    this.Power = 2;                // сила монстра которая определяет максимальное колличство шагов за раз,
    this.Steps = 2;                // текущее количество оставшихся шагов,
    this.SkipTurns = 0;            // количество ходов которые пропустит монстр,
    this.SkipTurnsEnabled = true;  // будет ли монст пропускать ходы если попадет в ловушку.
}

/**
 * Объявление не экземплярной функци проставления силы монстра.
 * @param {Number} power сила монстра, которую необходимо проставить.
 */
Monster.prototype.SetPower = function(power){
    // Если монстр набирает силу больше двух, то его не остановить в ловушке.
    this.SkipTurnsEnabled = power <= 2;

    // Если монстр стал сильней, то он теряет ходы и выходит из ловушки, если в ней стоял.
    if(power > this.Power) {
        this.Steps = 0;
        this.SkipTurns = 0;
    }

    this.Power = power;
}
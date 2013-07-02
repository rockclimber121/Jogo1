/**
 * Размер квадратной ячейки
 */
var cellSize = 50;

/**
 * Ширина стенки между ячейками. Стенкой считается непреодолимое препятсвие.
 */
var wallWidth = 3;

/**
 * Окно игры. Отдельный фрейм с игровым полем. Содержит методы по работе с ним.
 */
var GameWindow = {
    /**
     * Матрица ячеек. Формат одной ячейки: X - координате по горизонтали, Y - координата по вертикали,
     * Width - Ширина, Height - Высота, Value - значение соответвубщее тому, что находится в ячейке,
     * RightWall - есть ли стенка справа, BottomWall - есть ли стенка снизу,
     * Row - номер строки ячейки в матрице, Col - номер столбца ячейки в матрице.
     */
    cells : undefined,

    /**
     * Перерисовывает поле в соответсвии с текущим значением ячеек cells.
     * @param {string} canvasId идентификатор полотна для отрисовки содержимого окна
     */
    Refresh : function(canvasId){
        var canvas = document.getElementById(canvasId);
        var context = canvas.getContext("2d");

        for(i = 0; i < cells.length; i++){
            for(j = 0; j < cells[i].length; j++){
                var cell = cells[i][j];
                context.beginPath();

                // Рисуем ячейки
                switch (cell.Value){
                    case 0:
                        // рисуем пустую клетку (очищаем её)
                        context.fillStyle = 'white';
                        context.rect(cell.X, cell.Y, cell.Width, cell.Height);
                        break;
                    case 1:
                        // рисуем печать
                        context.fillStyle = 'orange';
                        context.rect(cell.X, cell.Y, cell.Width, cell.Height);
                        break;
                    case 2:
                        // рисуем демона
                        context.fillStyle = 'red';
                        context.rect(cell.X, cell.Y, cell.Width, cell.Height);
                        break;
                    case 3:
                        // рисуем героя
                        context.fillStyle = 'blue';
                        context.rect(cell.X, cell.Y, cell.Width, cell.Height);
                        break;
                    case 4:
                        // рисуем дом
                        context.fillStyle = 'green';
                        context.rect(cell.X, cell.Y, cell.Width, cell.Height);
                        break;
                }

                context.fill();
                context.lineWidth = 1;
                context.strokeStyle = 'black';
                context.stroke();
            }
        }

        // Рисуем стенки после всего, чтобы они были поверх.
        context.lineWidth = wallWidth;
        for(i = 0; i < cells.length; i++)
            for(j = 0; j < cells[i].length; j++){
                var cell = cells[i][j];

                if(cell.RightWall) {
                    context.beginPath();
                    context.moveTo(cell.X + cell.Width - wallWidth/2, cell.Y);
                    context.lineTo(cell.X + cell.Width - wallWidth/2, cell.Y + cell.Height);
                    context.stroke();
                }
                else if(cell.BottomWall) {
                    context.beginPath();
                    context.moveTo(cell.X, cell.Y + cell.Height - wallWidth/2);
                    context.lineTo(cell.X + cell.Width, cell.Y + cell.Height - wallWidth/2);
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

        // очищаем поле
        var canvas = document.getElementById(canvasId);
        var context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);

        // рисуем фон
        var img = new Image();
        img.src = "Hell1.JPG";
        context.drawImage(img, 0, 0);

        // ШАГ 1. Подготавливаем все к отрисовке клеток и стенок.

        var center = { X: canvas.width/2, Y: canvas.height/2 };
        var countCellsInCol = (field.length + 1)/2;
        var countCellsInRow = (field[0].length + 1)/2;
        cells = [];

        for(i = 0; i < countCellsInCol; i++){
            cells[i] = [];
            for(j = 0; j < countCellsInRow; j++){
                //собираем ячейку
                var newCell = {
                    X: center.X + (j - (countCellsInRow/2|0)) * cellSize,
                    Y: center.Y + (i - (countCellsInCol/2|0)) * cellSize,
                    Width: cellSize,
                    Height: cellSize,
                    Value: field[i*2][j*2],
                    Row: i,
                    Col: j,
                    RightWall: false,
                    BottomWall: false
                };

                // если ячеек в строке нечетное количество, то сдвигаем на по ячейки по горизонтали
                if(countCellsInRow%2 == 1)
                    newCell.X -= cellSize/2;

                // если ячеек в столбце нечетное количество, то сдвигаем на по ячейки по вертикали
                if(countCellsInCol)
                    newCell.Y -= cellSize/2;

                cells[i][j] = newCell;
            }
        }

        // TODO добавить дом в ячейки, если он был вне поля

        // Шаг 2. Подготавливаем стенки для отрисовки.

        for(i = 0; i < field.length; i++){
            for(j = 0; j < field[i].length; j++){
                // Если это нечетная строчка, то стенки на четных позициях.
                // Если четная строчка, то стенки на нечетных позициях.
                // Проверка при делении по модулю 2 перевернута из-за того что индексы идут с 0.

                if(i%2 == 0 && j%2 == 1 && field[i][j] == 1){
                    cells[i/2][j/2 - 1/2].RightWall = true;
                }

                if(i%2 == 1 && j%2 == 0 && field[i][j] == 1){
                    cells[i/2 - 1/2][j/2].BottomWall = true;
                }
            }
        }

       // Шаг 3. Рисуем все.
       GameWindow.Refresh(canvasId);
   }
}
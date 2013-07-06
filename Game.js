/**
 * Основной объект реализующий логику игры.
 */
var Game = {
    /**
     * Массив монстров в формате: CurrentPosition - текущая ячейка в которой находится монстр,
     * Power - сила монстра которая определяет максимальное колличство шагов за раз,
     * Steps - текущее количество оставшихся шагов,
     * SkipTurns - количество ходов которые пропустит монстр,
     * SkipTurnsEnabled - будет ли монст пропускать ходы если попадет в ловушку.
     */
    monsters : [],

    /**
     * Инициализирует игру. Создание подписчиков на события.
     * @param canvasId Идентификатор полотна для отрисовки уровня.
     */
    Init : function(canvasId){
        // Подписываемся на событие клика по полотну, чтобы определять куда хочет сходить пользователь.
        var canvas = document.getElementById(canvasId);
        var rect = canvas.getBoundingClientRect();
        canvas.addEventListener('click', function(event) {
            var cell = GameWindow.GetCellByCoordinates(event.pageX - rect.left, event.pageY - rect.top);

            if(cell !== undefined)
                Game.TryDoStep(cell);
        }, false);
    },

    /**
     * Сбрасывает все параметры необходимые для конкретного уровня.
    */
    Refresh : function() {
       this.monsters = [];
    },

    InitMonsters : function(){
        var cells = GameWindow.GetCellsWithMonsters();
        $.each(cells, function(){
            Game.monsters.push({
                CurrentPosition : this,
                Power : 2,
                Steps : 2,
                SkipTurns : 0,
                SkipTurnsEnabled : true
            });
        });
    },

    /**
     * Проверяет можно ли сделать шаг в указанную клетку и совершает его.
     * @param {object} cell Ячейка в которую хочет сходить пользователь.
     */
    TryDoStep : function(cell){
        var currentCell = GameWindow.currentCell;

        // Если кликнули в туже ячейку, то не ходим.
        if(currentCell === cell)
            return;

        // Если эта ячейка является соседней для текущей и на пути нет стенки, то ходим.
        if(cell.Row - currentCell.Row == 1 && cell.Col - currentCell.Col == 0 && !currentCell.BottomWall ||
           cell.Row - currentCell.Row == -1 && cell.Col - currentCell.Col == 0 && !currentCell.TopWall ||
           cell.Row - currentCell.Row == 0 && cell.Col - currentCell.Col == 1 && !currentCell.RightWall ||
           cell.Row - currentCell.Row == 0 && cell.Col - currentCell.Col == -1 && !currentCell.LeftWall) {
            switch (cell.Value) {
                case Levels.Home:
                    Game.WinEvent();
                    break;

                case Levels.Monster:
                case Levels.Trap:
                    Game.LoseEvent();
                   break;
                case Levels.Empty:
                    // Для шага переназначаем значения ячеек.
                    cell.Value = Levels.Hero;
                    currentCell.Value = Levels.Empty;

                    // Обновляем текущую ячейку.
                    GameWindow.currentCell = cell;

                    // Передвигаем монстров.
                    Game.MoveMonsters();

                    // Перерисовываем все с учетом новой матрицы.
                    GameWindow.Refresh();
                    break;
            }
        }
    },

    MoveMonsters : function(){
        if(this.monsters.length == 0)
            Game.InitMonsters();

        var getMonsterIndexByPosition = function(positionCell){
            for(var i = 0; i < Game.monsters.length; i++) {
                if(Game.monsters[i].CurrentPosition == positionCell)
                    return i;
            }
        };

        var monstersForDelete = [];

        var stopFlag = true;
        while(stopFlag){
            // в начале цикла скидываем флаг
            stopFlag = false;

            for(var i = 0; i < Game.monsters.length; i++) {
                var monster = Game.monsters[i];

                // вынужены проверять клетку для совершения хода перед сортировкой
                // потому что после неё подменяется текущий монстр.
                var nextCell = Game.GetNextCellForMonster(monster);

                if(nextCell.MonsterPower > 0) {
                    // Сортируем массив монстров. Сортировка необходима для избежания конфликтов.
                    // Так как монстры должны ходить синхронно, а мы вынуждены писать асинхронный алгоритм,
                    // то для разрешения ситуации, когда монстр хочет встать в ячейку с другим монстром,
                    // который ещё не успел сделать шаг, необходима сортировка.
                    var index = getMonsterIndexByPosition(nextCell);
                    if(index >  i) {
                        Game.monsters[i] = Game.monsters[index];
                        Game.monsters[index] = monster;
                        monster = Game.monsters[i];
                    }
                }

                if(monster.Steps > 0 && monster.SkipTurns == 0) {
                    // передвигаем монстра в новую ячейку.
                    monster.CurrentPosition.MonsterPower = 0;
                    monster.CurrentPosition = nextCell;

                    // если в новой ячейке уже стоял монстр, то объединяем их.
                    if (nextCell.MonsterPower > 0) {
                        nextCell.MonsterPower = 3;
                        monster.Power = 3;
                        var index = getMonsterIndexByPosition(nextCell);
                        Game.monsters[index].Power = 3;

                        // при объединении все монстры теряют шаги и могут выйти из ловушек
                        monster.Steps = 0;
                        monster.SkipTurnsEnabled = false;
                        Game.monsters[index].Steps = 0;
                        Game.monsters[index].SkipTurns = 0;
                        Game.monsters[index].SkipTurnsEnabled = false;

                        monstersForDelete.push(i);
                    } else {
                        nextCell.MonsterPower = monster.Power;
                        switch(monster.CurrentPosition.Value) {
                            case Levels.Hero:
                                // Пользователь проиграл, когда монстр попал в клетку с героем.
                                this.LoseEvent();
                                return;

                            case Levels.Trap:
                            case Levels.Home:
                            case Levels.Empty:
                                if(monster.CurrentPosition.Value == Levels.Trap && monster.SkipTurnsEnabled){
                                    // Монстр пропускает 3 хода + текущий.
                                    monster.SkipTurns = 4;
                                } else {
                                    // Делает шаг.
                                }

                                break;
                        }
                    }

                    monster.Steps--;

                    // Если после сделанного шага остались ещё шаги, то цикл будет продолжен
                    if(monster.Steps > 0)
                        stopFlag = true;
                }
            }
        }

        // Удалим лишних демонов - это нужно, если они соеденились.
        if(monstersForDelete.length > 0){
            monstersForDelete.sort(function(a, b){
                return b-a;
            });

            for(var i = 0; i < monstersForDelete.length; i ++){
                Game.monsters.splice(monstersForDelete[i], 1);
            }
        }

        // После того как все отходили, проставляем их ходы обратно.
        // Для попавших в ловушку уменьшаем время простоя.
        $.each(Game.monsters, function() {
            this.Steps = this.Power;
            if(this.SkipTurns > 0)
                this.SkipTurns--;
        });
    },

    /**
     * Получить ячейку для следуещего шага.
     * @param {object} monster монстр для которого будет вычислена ячейка.
     */
    GetNextCellForMonster : function(monster){
        var changeRow = function(){
            // если герой ниже монстра, то монстр попытается спуститься
            if (GameWindow.currentCell.Row > monster.CurrentPosition.Row) {
                // если на пути у него стенка, то он останется на месте
                if (GameWindow.cells[monster.CurrentPosition.Row + 1][monster.CurrentPosition.Col].TopWall)
                    return monster.CurrentPosition;

                return GameWindow.cells[monster.CurrentPosition.Row + 1][monster.CurrentPosition.Col];
            } else {
                // если на пути у него стенка, то он останется на месте
                if (GameWindow.cells[monster.CurrentPosition.Row - 1][monster.CurrentPosition.Col].BottomWall)
                    return monster.CurrentPosition;

                return GameWindow.cells[monster.CurrentPosition.Row - 1][monster.CurrentPosition.Col];
            }
        };

        var changeCol = function(){
            // если герой правее монстра, то монстр попытается пройти в право
            if(GameWindow.currentCell.Col > monster.CurrentPosition.Col) {
                // если на пути у него стенка, то он останется на месте
                if(GameWindow.cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col + 1].LeftWall)
                    return monster.CurrentPosition;

                return GameWindow.cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col + 1];
            } else {
                // если на пути у него стенка, то он останется на месте
                if(GameWindow.cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col - 1].RightWall)
                    return monster.CurrentPosition;

                return GameWindow.cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col - 1];
            }
        };

        // Если они стоят в одном столбце, то монстр попытается пройти по вертикали.
        if (GameWindow.currentCell.Col == monster.CurrentPosition.Col){
            return changeRow();
        }

        // если монстр и герой не в одном столбце, то он постарается сначала приблизится к герою по горизонтали
        var newCell = changeCol();

        if(newCell != monster.CurrentPosition)
            return newCell;

        // если по горизонтали стенка, то он постарается сходить по вертикали, если он не стоит в одной с ним строке.
        if (GameWindow.currentCell.Row != monster.CurrentPosition.Row){
            return changeRow();
        }

        return monster.CurrentPosition;
    },

    WinEvent : function() {
        alert("Complete");
    },

    LoseEvent : function(){
        alert("Fail");
    }
};
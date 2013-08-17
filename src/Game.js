/**
 * Основной объект реализующий логику игры.
 */
var Game = {
    /**
     * Массив монстров, которые находятся в игре.
     */
    monsters : [],

    /**
     * Герой - объект основного персонажа.
     */
    hero : undefined,

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
     * Проверяет можно ли сделать шаг в указанную клетку и совершает его.
     * @param {object} cell Ячейка в которую хочет сходить пользователь.
     */
    TryDoStep : function(cell){
        var currentCell = Game.hero.CurrentPosition;

        // Если кликнули в ту же ячейку, то не ходим.
        if(currentCell === cell)
            return;

        // Если эта ячейка является соседней для текущей и на пути нет стенки, то ходим.
        if(cell.Row - currentCell.Row == 1 && cell.Col - currentCell.Col == 0 && !currentCell.BottomWall ||
           cell.Row - currentCell.Row == -1 && cell.Col - currentCell.Col == 0 && !currentCell.TopWall ||
           cell.Row - currentCell.Row == 0 && cell.Col - currentCell.Col == 1 && !currentCell.RightWall ||
           cell.Row - currentCell.Row == 0 && cell.Col - currentCell.Col == -1 && !currentCell.LeftWall) {

           if(cell.Place && cell.Place instanceof Trap || cell.Unit && cell.Unit instanceof Monster){
                Game.LoseEvent();
           }
           else if(cell.Place && cell.Place instanceof Home){
               Game.WinEvent();
           }
           else {
               // Для шага переназначаем значения ячеек.
               cell.Unit = Game.hero;
               currentCell.Unit = undefined;
               Game.hero.CurrentPosition = cell;

               // Передвигаем монстров.
               Game.MoveMonsters();

               // Перерисовываем все с учетом новой матрицы.
               GameWindow.Refresh();
           }
        }
    },

    MoveMonsters : function(){
        var getMonsterIndexByPosition = function(positionCell){
            for(var i = 0; i < Game.monsters.length; i++) {
                if(Game.monsters[i].CurrentPosition == positionCell)
                    return i;
            }

            return undefined;
        };

        var stopFlag = true;
        while(stopFlag){
            var monstersForDelete = [];
            // в начале цикла скидываем флаг
            stopFlag = false;

            for(i = 0; i < this.monsters.length; i++) {
                var monster = this.monsters[i];

                var nextCell = Game.GetNextCellForMonster(monster);
                var index = i + 1;

                // Сортируем массив монстров. Сортировка необходима для избежания конфликтов.
                // Так как монстры должны ходить синхронно, а мы вынуждены писать асинхронный алгоритм,
                // то для разрешения ситуации, когда монстр хочет встать в ячейку с другим монстром,
                // который ещё не успел сделать шаг, необходима сортировка.
                // Так как монстры не могут идти в разные стороны, то циклов быть не может.
                while(nextCell.Unit && nextCell.Unit instanceof Monster)
                {
                    index = getMonsterIndexByPosition(nextCell);

                    if(index >  i) {
                        this.monsters[i] = this.monsters[index];
                        this.monsters[index] = monster;
                        monster = this.monsters[i];
                        nextCell = this.GetNextCellForMonster(monster);
                    }
                    else
                    {
                        break;
                    }
                }

                if(monster.Steps > 0 && monster.SkipTurns == 0 &&
                    // Если монстр уже стоит на ловушке и пытается в неё же сходить, то он останется на месте.
                    (nextCell !== monster.CurrentPosition || !monster.CurrentPosition.Place ||
                        ! monster.CurrentPosition.Place instanceof Trap)) {

                    // передвигаем монстра в новую ячейку.
                    monster.CurrentPosition.Unit = undefined;
                    monster.CurrentPosition = nextCell;

                    // если в новой ячейке уже стоял монстр, то объединяем их.
                    if (nextCell.Unit && nextCell.Unit instanceof Monster) {
                        nextCell.MonsterPower = 3;
                        monster.SetPower(3);
                        var anotherMonster = this.monsters[getMonsterIndexByPosition(nextCell)];
                        anotherMonster.SetPower(3);

                        monstersForDelete.push(i);
                    } else {
                        if(nextCell.Unit && nextCell.Unit instanceof Hero){
                            // Пользователь проиграл, когда монстр попал в клетку с героем.
                            // Но необходимо дать монстрам доходить до конца.
                            this.LoseEvent();
                        }
                        else if(nextCell.Place && nextCell.Place instanceof Trap && monster.SkipTurnsEnabled){
                            // Монстр пропускает 3 хода + текущий.
                            monster.SkipTurns = 4;
                        }

                        nextCell.Unit = monster;
                    }

                    monster.Steps--;

                    // Если после сделанного шага остались ещё шаги, то цикл будет продолжен
                    if(monster.Steps > 0)
                        stopFlag = true;
                }
            }

            // Удалим лишних демонов - это нужно, если они соеденились.
            if(monstersForDelete.length > 0){
                monstersForDelete.sort(function(a, b){
                    return b-a;
                });

                for(var i = 0; i < monstersForDelete.length; i ++){
                    // Проверяем, чтобы не было совпадений, а то удалятся нужные монстры.
                    if(i == 0 || monstersForDelete[i] != monstersForDelete[i - 1])
                        this.monsters.splice(monstersForDelete[i], 1);
                }
            }
        }

        // После того как все отходили, проставляем их ходы обратно.
        // Для попавших в ловушку уменьшаем время простоя.
        $.each(this.monsters, function() {
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
            if (Game.hero.CurrentPosition.Row > monster.CurrentPosition.Row) {
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
            if(Game.hero.CurrentPosition.Col > monster.CurrentPosition.Col) {
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
        if (Game.hero.CurrentPosition.Col == monster.CurrentPosition.Col){
            return changeRow();
        }

        // если монстр и герой не в одном столбце, то он постарается сначала приблизится к герою по горизонтали
        var newCell = changeCol();

        if(newCell != monster.CurrentPosition)
            return newCell;

        // если по горизонтали стенка, то он постарается сходить по вертикали, если он не стоит в одной с ним строке.
        if (Game.hero.CurrentPosition.Row != monster.CurrentPosition.Row){
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
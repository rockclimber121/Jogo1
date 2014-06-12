/**
 * Основной объект реализующий логику игры.
 */
Jogo.Game = {
    /**
     * Делегат. Срабатывает, когда пользователь выйграл.
     */
    WinEvent : undefined,

    /**
     * Делегат. Срабатывает, когда пользователь проиграл.
     */
    LoseEvent : undefined,

    /**
     * Делегат. Срабатывает по окончанию хода.
     */
    EndTurnEvent : undefined,

    /**
     * Флаг обозначающий, что игра окончена.
     */
    gameOver : false,

    /**
     * На данный момент происходит анимация. Флаг необходим для остановки обработки событий канваса.
     */
    animating : false,

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
     * @param {Object} gameField DOM-объект игрового поля.
     */
    Init: function (gameField) {
        // Подписываемся на событие клика по полотну, чтобы определять, куда хочет сходить пользователь.
        gameField.addEventListener('click', function (event) {
            if (Jogo.Game.gameOver || Jogo.Game.animating)
                return;

            Jogo.Game.animating = true;

            var rect = gameField.getBoundingClientRect();
            var cell = Jogo.GameWindow.CurrentLevel.GetCellByCoordinates(event.pageX - rect.left, event.pageY - rect.top);

            if(cell)
                Jogo.Game.TryDoStep(cell);
            else
                Jogo.Game.EndTurn();

        }, false);
    },

    /**
     * Проверяет можно ли сделать шаг в указанную клетку и совершает его.
     * @param {object} cell Ячейка, в которую хочет сходить пользователь.
     */
    TryDoStep : function(cell) {
        var currentCell = Jogo.Game.hero.CurrentPosition;

        // Если кликнули в ту же ячейку, то не ходим.
        if (currentCell === cell) {
            this.EndTurn();
            return;
        }

        // Если эта ячейка является соседней для текущей и на пути нет стенки, то ходим.
        if (cell.Row - currentCell.Row == 1 && cell.Col - currentCell.Col == 0 && !currentCell.BottomWall ||
            cell.Row - currentCell.Row == -1 && cell.Col - currentCell.Col == 0 && !currentCell.TopWall ||
            cell.Row - currentCell.Row == 0 && cell.Col - currentCell.Col == 1 && !currentCell.RightWall ||
            cell.Row - currentCell.Row == 0 && cell.Col - currentCell.Col == -1 && !currentCell.LeftWall) {

            // Если герой встал на ловушку, либо если герой встретился с врагом, тогда проигрыш.
            var lose = (cell.Place instanceof Jogo.Trap || cell.Unit instanceof Jogo.Monster);

            // Если герой вошел в дом, то засчитываем победу.
            var win = (cell.Place instanceof Jogo.Home);

           // Для шага переназначаем значения ячеек.
           cell.Unit = this.hero;
           currentCell.Unit = undefined;
           this.hero.CurrentPosition = cell;

           // Перерисовываем поле, чтобы увидеть как сходит герой.
           Jogo.GameWindow.Redraw(function () {
               if(lose)
                   Jogo.Game.Lose();
               else if(win)
                   Jogo.Game.Win();
               else
                   Jogo.Game.MoveMonsters();
           });
        }
        else {
            this.EndTurn();
        }
    },

    MoveMonsters : function() {
        Jogo.Game.DoOneStepForMonsters(function() {
            // После того как все отходили, проставляем их ходы обратно.
            // Для попавших в ловушку уменьшаем время простоя.
            for (var i = 0; i < Jogo.Game.monsters.length; i++) {
                var monster = Jogo.Game.monsters[i];
                monster.Steps = monster.Power;
                if (monster.SkipTurns > 0)
                    monster.SkipTurns--;
            }
        });
    },

    /**
     * Монстры совершают по одному шагу, если могут.
     * @param {function} onSuccess Callback-функция, уведомляющая об окончании перемещения монстров.
     */
    DoOneStepForMonsters : function(onSuccess){

        // Получить индекс монстра в массиве, который стоит на указаной позиции.
        var getMonsterIndexByPosition = function(positionCell) {
            for (var i = 0; i < Jogo.Game.monsters.length; i++) {
                var deleted = false;
                for (var j = 0; j < monstersForDelete.length; j++) {
                    if (monstersForDelete[j] === i) {
                        deleted = true;
                        break;
                    }
                }

                if (!deleted && Jogo.Game.monsters[i].CurrentPosition.Col == positionCell.Col &&
                    Jogo.Game.monsters[i].CurrentPosition.Row == positionCell.Row)
                    return i;
            }

            return undefined;
        };

        // Флаг означающий, что все монстры отходили и герой может сделать следующий ход.
        var turnComplete = true;

        // Флаг означающий, что монстры сделали хотя бы один шаг и необходимо перерисовать поле.
        var needRedraw = false;

        // Массив индексов монстров для удаления. Необходим при соединении монстров.
        var monstersForDelete = [];

        // true, если пользователь проиграл (монстр догнал героя).
        var lose = false;

        // Перебираем всех монстров и пытаемся сделать ход.
        for (var i = 0; i < this.monsters.length; i++) {
            var monster = this.monsters[i];

            var nextCell = Jogo.Game.GetNextCellForMonster(monster);
            var index = i + 1;

            // Сортируем массив монстров. Сортировка необходима для избежания конфликтов.
            // Так как монстры должны ходить синхронно, а мы вынуждены писать асинхронный алгоритм,
            // то для разрешения ситуации, когда монстр хочет встать в ячейку с другим монстром,
            // который ещё не успел сделать шаг, необходима сортировка.
            // Так как монстры не могут идти в разные стороны, то циклов быть не может.
            while (nextCell.Unit instanceof Jogo.Monster) {
                index = getMonsterIndexByPosition(nextCell);

                if(index >  i) {
                    this.monsters[i] = this.monsters[index];
                    this.monsters[index] = monster;
                    monster = this.monsters[i];
                    nextCell = this.GetNextCellForMonster(monster);
                }
                else {
                    break;
                }
            }

            if (monster.Steps > 0 && monster.SkipTurns == 0 &&
                // Если монстр уже стоит на ловушке и пытается в неё же сходить, то он останется на месте.
                (nextCell !== monster.CurrentPosition || !monster.CurrentPosition.Place instanceof Jogo.Trap)) {

                // Передвигаем монстра в новую ячейку.
                monster.CurrentPosition.Unit = undefined;
                monster.CurrentPosition = nextCell;
                needRedraw = true;

                // Если в новой ячейке уже стоял монстр, то объединяем их.
                if (nextCell.Unit instanceof Jogo.Monster) {
                    nextCell.MonsterPower = 3;
                    monster.SetPower(3);
                    monster.Steps = 0;
                    monster.SkipTurns = 0;

                    var anotherMonsterIndex = getMonsterIndexByPosition(nextCell);
                    var anotherMonster = this.monsters[anotherMonsterIndex];
                    anotherMonster.SetPower(3);

                    monstersForDelete.push(anotherMonsterIndex);
                } else {
                    if (nextCell.Unit instanceof Jogo.Hero) {
                        // Пользователь проиграл, когда монстр попал в клетку с героем.
                        lose = true;
                    }
                    else if (nextCell.Place instanceof Jogo.Trap && monster.SkipTurnsEnabled) {
                        // Монстр пропускает 3 хода + текущий.
                        monster.SkipTurns = 4;
                    }

                    nextCell.Unit = monster;
                }

                monster.Steps--;

                // Если после сделанного шага остались ещё шаги, то цикл будет продолжен.
                if (monster.Steps > 0)
                    turnComplete = false;
            }
        }

        // Отметим лишних монстров - это нужно, если они соеденились.
        // После перерисовки игрового поля их нужно будет удалить.
        monstersForDelete.sort(function(a, b) { return b-a; });
        for (i = 0; i < monstersForDelete.length; i++){
            // Проверяем, чтобы не было совпадений, а то удалятся нужные монстры.
            if (i == 0 || monstersForDelete[i] != monstersForDelete[i - 1])
                this.monsters[monstersForDelete[i]].deleted = true;
        }

        var stepComplete = function () {
            // Удаляем лишних монстров, они нам больше не нужны.
            for (i = 0; i < monstersForDelete.length; i++) {
                if (i == 0 || monstersForDelete[i] != monstersForDelete[i - 1])
                    Jogo.Game.monsters.splice(monstersForDelete[i], 1);
            }

            if (!lose && !turnComplete) {
                Jogo.Game.DoOneStepForMonsters(onSuccess);
            } else {
                if (onSuccess)
                    onSuccess();

                if (lose)
                    Jogo.Game.Lose();
                else
                    Jogo.Game.EndTurn();
            }
        };

        if (needRedraw)
            Jogo.GameWindow.Redraw(stepComplete);
        else
            stepComplete();
    },

    /**
     * Получить ячейку для следуещего шага.
     * @param {object} monster монстр для которого будет вычислена ячейка.
     */
    GetNextCellForMonster : function(monster) {
        var changeRow = function() {
            // Если герой ниже монстра, то монстр попытается спуститься.
            if (Jogo.Game.hero.CurrentPosition.Row > monster.CurrentPosition.Row) {
                // Если на пути у него стенка, то он останется на месте.
                if (Jogo.GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row + 1][monster.CurrentPosition.Col].TopWall)
                    return monster.CurrentPosition;

                return Jogo.GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row + 1][monster.CurrentPosition.Col];
            } else {
                // Если на пути у него стенка, то он останется на месте.
                if (Jogo.GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row - 1][monster.CurrentPosition.Col].BottomWall)
                    return monster.CurrentPosition;

                return Jogo.GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row - 1][monster.CurrentPosition.Col];
            }
        };

        var changeCol = function(){
            // Если герой правее монстра, то монстр попытается пройти в право.
            if (Jogo.Game.hero.CurrentPosition.Col > monster.CurrentPosition.Col) {
                // Если на пути у него стенка, то он останется на месте.
                if (Jogo.GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col + 1].LeftWall)
                    return monster.CurrentPosition;

                return Jogo.GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col + 1];
            } else {
                // Если на пути у него стенка, то он останется на месте.
                if (Jogo.GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col - 1].RightWall)
                    return monster.CurrentPosition;

                return Jogo.GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col - 1];
            }
        };

        // Если они стоят в одном столбце, то монстр попытается пройти по вертикали.
        if (Jogo.Game.hero.CurrentPosition.Col == monster.CurrentPosition.Col) {
            return changeRow();
        }

        // Если монстр и герой не в одном столбце, то он постарается сначала приблизится к герою по горизонтали.
        var newCell = changeCol();
        if (newCell != monster.CurrentPosition)
            return newCell;

        // Если по горизонтали стенка, то он постарается сходить по вертикали, если он не стоит в одной с ним строке.
        if (Jogo.Game.hero.CurrentPosition.Row != monster.CurrentPosition.Row) {
            return changeRow();
        }

        return monster.CurrentPosition;
    },

    /**
     * Все необходимые действия по окончанию хода.
     */
    EndTurn: function() {
        this.animating = false;

        if (this.EndTurnEvent)
            this.EndTurnEvent();
    },

    Win: function() {
        this.gameOver = true;
        this.EndTurn();

        if (this.WinEvent)
            this.WinEvent();
    },

    Lose: function() {
        this.gameOver = true;

        if (this.LoseEvent)
            this.LoseEvent();
        else
            this.EndTurn();
    }
};
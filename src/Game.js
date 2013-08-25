/**
 * Основной объект реализующий логику игры.
 */
var Game = {
    /**
     * Настройки задержки времени до выполнения каких-либо операций в игре.
     */
    timeOutOptions : {
        HeroStepTimeOut : 200,    // Задержка пока герой сделает ход, необходима для анимации.
        MonsterStepTimeOut : 200  // Задержка пока монстр сделает ход, необходима для анимации.
    },

    /**
     * Делегат. Срабатывает, когда пользователь выйграл.
     */
    WinEvent : undefined,

    /**
     * Делегат. Срабатывает, когда пользователь проиграл.
     */
    LoseEvent : undefined,

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
     * @param canvasId Идентификатор полотна для отрисовки уровня.
     */
    Init : function(canvasId) {
        // Подписываемся на событие клика по полотну, чтобы определять куда хочет сходить пользователь.
        var canvas = document.getElementById(canvasId);

        canvas.addEventListener('click', function(event) {
            if(Game.gameOver || Game.animating)
                return;

            Game.animating = true;

            var rect = canvas.getBoundingClientRect();
            var cell = GameWindow.CurrentLevel.GetCellByCoordinates(event.pageX - rect.left, event.pageY - rect.top);

            if(cell)
                Game.TryDoStep(cell);
            else
                Game.EndTurn();

        }, false);
    },

    /**
     * Проверяет можно ли сделать шаг в указанную клетку и совершает его.
     * @param {object} cell Ячейка в которую хочет сходить пользователь.
     */
    TryDoStep : function(cell) {
        var currentCell = Game.hero.CurrentPosition;

        // Если кликнули в ту же ячейку, то не ходим.
        if(currentCell === cell) {
            this.EndTurn();
            return;
        }

        // Если эта ячейка является соседней для текущей и на пути нет стенки, то ходим.
        if(cell.Row - currentCell.Row == 1 && cell.Col - currentCell.Col == 0 && !currentCell.BottomWall ||
           cell.Row - currentCell.Row == -1 && cell.Col - currentCell.Col == 0 && !currentCell.TopWall ||
           cell.Row - currentCell.Row == 0 && cell.Col - currentCell.Col == 1 && !currentCell.RightWall ||
           cell.Row - currentCell.Row == 0 && cell.Col - currentCell.Col == -1 && !currentCell.LeftWall) {

           if(cell.Place instanceof Trap || cell.Unit instanceof Monster) {
                this.Lose();
           }
           else if(cell.Place instanceof Home) {
               this.Win();
           }
           else {
               // Для шага переназначаем значения ячеек.
               cell.Unit = this.hero;
               currentCell.Unit = undefined;
               this.hero.CurrentPosition = cell;

               // Перерисовываем поле, чтобы увидеть как сходит герой.
               GameWindow.Redraw();

               // Передвигаем монстров.
               setTimeout(function(){
                   Game.MoveMonsters();
               }, this.timeOutOptions.HeroStepTimeOut);
           }
        }
        else {
            this.EndTurn();
        }
    },

    MoveMonsters : function() {

       setTimeout(function() {
           Game.DoOneStepForMonsters();
       }, this.timeOutOptions.MonsterStepTimeOut);

       // После того как все отходили, проставляем их ходы обратно.
       // Для попавших в ловушку уменьшаем время простоя.
       $.each(this.monsters, function() {
           this.Steps = this.Power;
           if(this.SkipTurns > 0)
               this.SkipTurns--;
       });
    },

    /**
     * Монстры совершают по одному шагу, если могут.
     */
    DoOneStepForMonsters : function(){
        // Получить индекс монстра в массиве, который стоит на указаной позиции.
        var getMonsterIndexByPosition = function(positionCell) {
            for(var i = 0; i < Game.monsters.length; i++) {
                if(Game.monsters[i].CurrentPosition == positionCell)
                    return i;
            }

            return undefined;
        };

        // Флаг означающий, что все монстры отходили и герой может сделать следующий ход.
        var turnComplete = true;

        // Флаг означающий, что монстры сделали хотя бы один шаг и необходимо перерисовать поле.
        var needRefresh = false;

        // Массив монстров для удаления. Необходим при соединении монстров.
        var monstersForDelete = [];

        // Перебираем всех монстров и пытаемся сделать ход.
        for(i = 0; i < this.monsters.length; i++) {
            var monster = this.monsters[i];

            var nextCell = Game.GetNextCellForMonster(monster);
            var index = i + 1;

            // Сортируем массив монстров. Сортировка необходима для избежания конфликтов.
            // Так как монстры должны ходить синхронно, а мы вынуждены писать асинхронный алгоритм,
            // то для разрешения ситуации, когда монстр хочет встать в ячейку с другим монстром,
            // который ещё не успел сделать шаг, необходима сортировка.
            // Так как монстры не могут идти в разные стороны, то циклов быть не может.
            while(nextCell.Unit instanceof Monster) {
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

            if(monster.Steps > 0 && monster.SkipTurns == 0 &&
                // Если монстр уже стоит на ловушке и пытается в неё же сходить, то он останется на месте.
                (nextCell !== monster.CurrentPosition || ! monster.CurrentPosition.Place instanceof Trap)) {

                // Передвигаем монстра в новую ячейку.
                monster.CurrentPosition.Unit = undefined;
                monster.CurrentPosition = nextCell;
                needRefresh = true;

                // Если в новой ячейке уже стоял монстр, то объединяем их.
                if (nextCell.Unit instanceof Monster) {
                    nextCell.MonsterPower = 3;
                    monster.SetPower(3);

                    var anotherMonster = this.monsters[getMonsterIndexByPosition(nextCell)];
                    anotherMonster.SetPower(3);

                    monstersForDelete.push(i);
                } else {
                    if(nextCell.Unit instanceof Hero){
                        // Пользователь проиграл, когда монстр попал в клетку с героем.
                        // Но необходимо дать монстрам доходить до конца.
                        this.Lose();
                    }
                    else if(nextCell.Place instanceof Trap && monster.SkipTurnsEnabled) {
                        // Монстр пропускает 3 хода + текущий.
                        monster.SkipTurns = 4;
                    }

                    nextCell.Unit = monster;
                }

                monster.Steps--;

                // Если после сделанного шага остались ещё шаги, то цикл будет продолжен.
                if(monster.Steps > 0)
                    turnComplete = false;
            }
        }

        // Удалим лишних монстров - это нужно, если они соеденились.
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

        if(needRefresh)
            GameWindow.Redraw();

        if(!turnComplete)
            setTimeout(function() {
                Game.DoOneStepForMonsters();
            }, this.timeOutOptions.MonsterStepTimeOut);
        else
            this.EndTurn();
    },

    /**
     * Получить ячейку для следуещего шага.
     * @param {object} monster монстр для которого будет вычислена ячейка.
     */
    GetNextCellForMonster : function(monster){
        var changeRow = function(){
            // Если герой ниже монстра, то монстр попытается спуститься.
            if (Game.hero.CurrentPosition.Row > monster.CurrentPosition.Row) {
                // Если на пути у него стенка, то он останется на месте.
                if (GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row + 1][monster.CurrentPosition.Col].TopWall)
                    return monster.CurrentPosition;

                return GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row + 1][monster.CurrentPosition.Col];
            } else {
                // Если на пути у него стенка, то он останется на месте.
                if (GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row - 1][monster.CurrentPosition.Col].BottomWall)
                    return monster.CurrentPosition;

                return GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row - 1][monster.CurrentPosition.Col];
            }
        };

        var changeCol = function(){
            // Если герой правее монстра, то монстр попытается пройти в право.
            if(Game.hero.CurrentPosition.Col > monster.CurrentPosition.Col) {
                // Если на пути у него стенка, то он останется на месте.
                if(GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col + 1].LeftWall)
                    return monster.CurrentPosition;

                return GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col + 1];
            } else {
                // Если на пути у него стенка, то он останется на месте.
                if(GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col - 1].RightWall)
                    return monster.CurrentPosition;

                return GameWindow.CurrentLevel.Cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col - 1];
            }
        };

        // Если они стоят в одном столбце, то монстр попытается пройти по вертикали.
        if (Game.hero.CurrentPosition.Col == monster.CurrentPosition.Col) {
            return changeRow();
        }

        // Если монстр и герой не в одном столбце, то он постарается сначала приблизится к герою по горизонтали.
        var newCell = changeCol();

        if(newCell != monster.CurrentPosition)
            return newCell;

        // Если по горизонтали стенка, то он постарается сходить по вертикали, если он не стоит в одной с ним строке.
        if (Game.hero.CurrentPosition.Row != monster.CurrentPosition.Row) {
            return changeRow();
        }

        return monster.CurrentPosition;
    },

    /**
     * Все необходимые действия по окончанию хода.
     */
    EndTurn : function() {
        this.animating = false;
    },

    Win : function() {
        this.gameOver = true;
        this.EndTurn();
        alert("Complete");

        if(this.WinEvent) {
            this.WinEvent();
        }
    },

    Lose : function() {
        this.gameOver = true;
        this.EndTurn();
        alert("Fail");

        if(this.LoseEvent) {
            this.LoseEvent();
        }
    }
};
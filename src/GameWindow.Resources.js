/**
 * Графические ресурсы игрового поля.
 */
Jogo.GameWindow.imageResources = {
    enemy: "images/enemy.png", // Вражеский персонаж с силой 1.
    trappedEnemy: "images/trappedEnemy.png", // Вражеский персонаж с силой 1, застрявший в ловушке.
    enemy2: "images/enemy2.png", // Вражеский персонаж с силой 2.
    hero: "images/hero.png", // Герой.
    house: "images/house.png", // Дом - цель героя.
    trap: "images/trap.png", // Ловушка, на которой вражеский персонаж теряет игровые ходы.
    background: "images/background.png", // Фон игрового поля.
    cell: "images/cell.png", // Фон пустой ячейки.
    tree: "images/tree.png", // Декорация: ёлка.
    wall: "images/wall.png", // Стена (препятствие).
    decor: "images/decor.png", // Прочие декорации.
    heroBeaten: "images/heroBeaten.png", // "Драка" героя и врага - проигрыш.
    heroTrapped: "images/heroTrapped.png", // Герой оказался в ловушке (Trap) - проигрыш.
    enemyCombining: "images/enemyCombining.png", // Эффект при объединении монстров.
    controls: "images/controls.png" // Изображения кнопок на панели контролов игры.
};

/**
 * Звуковые ресурсы игры.
 */
Jogo.GameWindow.soundResources = {
    // Фоновая музыка игры.
    background1: 'sounds/background1.mp3',
    background2: 'sounds/background2.mp3',
    background3: 'sounds/background3.mp3',
    background4: 'sounds/background4.mp3',
    background5: 'sounds/background5.mp3',

    monsterCombine: 'sounds/monster_combine.mp3' /* Монстры объединяются друг с другом */,
    heroWalk: 'sounds/hero_walk.mp3' /* Ходьба героя */,
    monsterWalk: 'sounds/monster_walk.mp3' /* Ходьба монстра */,
    roundVictory: 'sounds/victory.mp3' /* Раунд пройден */,
    roundFail: 'sounds/fail.mp3' /* Раунд проигран */,
    click: 'sounds/click.mp3' /* Щелчок мышью на игровом поле */
};
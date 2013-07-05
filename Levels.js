/**
 * Описание всех уровней игры.
 */
var Levels = {
    // Константы для использования во вне.

    Empty : 0,
    Trap : 1,
    Home : 2,
    Hero : 3,
    Monster : 4,

	/**
	 * Возвращает все уровни игры.
	 * 
	 * @returns {Array} Массив уровней.
     * Уровень представляется двумя объектами.
     *
     * Первым объектом является массив из 2х координат расположения дома.
     * Это необходимо на случай, если дом находится вне поля.
	 *
	 * Вторым объектом является матрица описывающая клетки поля.
	 * 
	 * Значение каждой нечетной клетки по вертикали и горизонтали соответствует клетке на поле:
	 * 0 - пустая клетка
	 * 1 - печать
	 * 2 - дом
	 * 3 - герой
	 * 4 - монстр
	 *
	 * Значение каждой четной клетки по вертикали и горизонтали соответствует стенке:
	 * 0 - нет стенки
	 * 1 - есть стенка
	 */
	GetAllLevels : function(){
		var levels = [];
                levels.push({
                    home: [0, 0],
                    field: [
                        [2, 1, 4],
                        [0, 0, 0],
                        [3, 1, 0]
                    ]
                });

        levels.push({
            home: [0, 0],
            field: [
                [2, 1, 0, 0, 4],
                [0, 0, 1, 0, 0],
                [3, 0, 0, 0, 0]
            ]
        });

        levels.push({
            home: [0, 0],
            field: [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 1, 4, 0, 0, 0, 0, 0, 4],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 2],
                [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
                [0, 1, 0, 1, 1, 0, 3, 0, 0, 0, 0],
                [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ]
        });

        levels.push({
            home: [0, 0],
            field: [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [2, 0, 0, 0, 0, 0, 4, 0, 1, 0, 1],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 3],
                [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ]
        });

		return levels;
	}
};

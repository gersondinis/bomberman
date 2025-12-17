var keys = {};

document.addEventListener('DOMContentLoaded', function () {
    let canvas = document.getElementById('canvas'),
        leftCanvas = document.getElementById('leftCanvas'),
        leftBottomCanvas = document.getElementById('leftBottomCanvas'),
        rightCanvas = document.getElementById('rightCanvas'),
        rightBottomCanvas = document.getElementById('rightBottomCanvas'),
        canvases = [canvas, leftCanvas, leftBottomCanvas, rightCanvas, rightBottomCanvas],
        game = new Game(canvas, leftCanvas, leftBottomCanvas, rightCanvas, rightBottomCanvas),
        lastTimeoutId = 0;

    iterateCanvas((canvas) => canvas.style.display = 'none');

    jQuery("#startGameBtn").click(startGame);

    jQuery("#players").click(startGame);

    function iterateCanvas(callable = (canvas) => {}) {
        for (let canvasIdx in canvases) {
            let canvas = canvases[canvasIdx];
            callable(canvas);
        }
    }

    function startGame() {
        window.clearTimeout(lastTimeoutId);
        game.start();
        update();
        iterateCanvas((canvas) => canvas.style.display = 'initial');
    }

    function update() {
        game.run(keys);
        lastTimeoutId = setTimeout(update, 20);

    }
    $( document ).keydown(function(e) {
        keys[e.which] = true;
        e.preventDefault();

    });
    $( document ).keyup(function(e) {
        keys[e.which] = false;
        e.preventDefault();

    });

    /*canvas.onmousemove = function (e) {
        let coords = getMousePos(this, e);
        let draw = new CanvasRect('draw',coords.x,coords.y,10,10);
        game.addComponent(draw);
        game.render(false);
    };

    function getMousePos(canvas, evt) {
        let rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }*/

});

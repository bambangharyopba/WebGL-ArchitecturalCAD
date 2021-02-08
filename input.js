var input = function (){
    return {
        getMousePos: (canvas, ev) => {
            let rect = canvas.getBoundingClientRect();
            return {
                x: ev.clientX - rect.left,
                y: ev.clientY - rect.top
            };
        },
    }
}
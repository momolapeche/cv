export type BufferBinder = (index: number) => void

export function createBinder(gl: WebGL2RenderingContext, buffer: WebGLBuffer, size: number, type: number, byteStride: number, byteOffset: number): BufferBinder {
    if (type === gl.UNSIGNED_BYTE || type === gl.UNSIGNED_SHORT || type === gl.UNSIGNED_INT) {
        return function(index: number) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.enableVertexAttribArray(index)
            gl.vertexAttribIPointer(
                index,
                size,
                type,
                byteStride,
                byteOffset
            )
        }
    }
    else {
        return function(index: number) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.enableVertexAttribArray(index)
            gl.vertexAttribPointer(
                index,
                size,
                type,
                false,
                byteStride,
                byteOffset
            )
        }
    }
}

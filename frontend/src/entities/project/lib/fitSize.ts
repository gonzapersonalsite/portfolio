export interface Size {
  width: number
  height: number
}

// Largest size that keeps the aspect ratio inside the box, never above the natural size.
export const fitSize = (natural: Size, box: Size): Size => {
  const scale = Math.min(box.width / natural.width, box.height / natural.height, 1)
  return { width: natural.width * scale, height: natural.height * scale }
}

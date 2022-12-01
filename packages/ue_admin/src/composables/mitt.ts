import mitt from 'mitt'

const emitter = mitt()

export function useMitt() {
  return emitter
}

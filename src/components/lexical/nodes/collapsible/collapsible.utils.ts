export function setDomHiddenUntilFound(dom: HTMLElement): void {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  dom.hidden = 'until-found'
}

export function domOnBeforeMatch(dom: HTMLElement, callback: () => void): void {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  dom.onbeforematch = callback
}

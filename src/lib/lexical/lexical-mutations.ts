import type { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'

import { getWindow } from '@/lib/lexical/lexical-utils.ts'

// The time between a text entry event and the mutation observer firing.
const TEXT_MUTATION_VARIANCE = 100

const isProcessingMutations = false
let lastTextEntryTimeStamp = 0

export function getIsProcessingMutations(): boolean {
  return isProcessingMutations
}

function updateTimeStamp(event: Event) {
  lastTextEntryTimeStamp = event.timeStamp
}

function initTextEntryListener(editor: LexicalEditor): void {
  if (lastTextEntryTimeStamp === 0) {
    getWindow(editor).addEventListener('textInput', updateTimeStamp, true)
  }
}

export function $flushMutations(
  editor: LexicalEditor,
  mutations: Array<MutationRecord>,
  observer: MutationObserver,
): void {}

/**
 * 루트 변이를 플러시합니다.
 *
 * @param editor - 변이를 플러시할 LexicalEditor 인스턴스입니다.
 */

export function $flushRootMutations(editor: LexicalEditor): void {
  const observer = editor._observer

  if (observer !== null) {
    const mutations = observer.takeRecords()
    $flushMutations(editor, mutations, observer)
  }
}

/**
 * 에디터에 변이 관찰자를 초기화합니다.
 *
 * @param editor - 변이 관찰자를 초기화할 LexicalEditor 인스턴스입니다.
 */
export function initMutationObserver(editor: LexicalEditor): void {
  initTextEntryListener(editor)
  editor._observer = new MutationObserver(
    (mutations: Array<MutationRecord>, observer: MutationObserver) => {
      $flushMutations(editor, mutations, observer)
    },
  )
}

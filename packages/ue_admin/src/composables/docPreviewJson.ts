import { ref, toRaw } from 'vue'

export type DocPreviewJsonSaveCallback = (newDoc: any) => void

export type DocPreviewJsonOptions = {
  document?: any
  onSave?: DocPreviewJsonSaveCallback
}

const opened = ref(false)

const previewDoc = ref<any>()

const cbSave = ref<DocPreviewJsonSaveCallback | null>()

export const useDocPreviewJson = (options?: DocPreviewJsonOptions) => {
  if (options?.document) previewDoc.value = toRaw(options.document)

  if (options?.onSave) cbSave.value = options.onSave

  return { opened, previewDoc, cbSave }
}

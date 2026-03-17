import request from '@/utils/request'

export const storyboardsAPI = {
  get(id) {
    return request.get(`/storyboards/${id}`)
  },
  create(data) {
    return request.post('/storyboards', data)
  },
  update(id, data) {
    return request.put(`/storyboards/${id}`, data)
  },
  delete(id) {
    return request.delete(`/storyboards/${id}`)
  },
  generateFramePrompt(id, data) {
    return request.post(`/storyboards/${id}/frame-prompt`, data)
  },
  polishPrompt(id) {
    return request.post(`/storyboards/${id}/polish-prompt`, {})
  },
  insertBefore(id) {
    return request.post(`/storyboards/${id}/insert-before`, {})
  },
  batchInferParams(episodeId, overwrite = false) {
    return request.post('/storyboards/batch-infer-params', { episode_id: episodeId, overwrite })
  },
  upscale(id) {
    return request.post(`/storyboards/${id}/upscale`, {})
  }
}

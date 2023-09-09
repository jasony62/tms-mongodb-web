let isCustomName =
  process.env.TMW_FINDER_FS_CUSTOMNAME === 'true' ? true : false

export default {
  local: {
    rootDir: 'storage', // 指定保存文件的目录
    outDir: 'storage', // 指定系统生成文件存放目录
    domains: {
      upload: { customName: isCustomName },
      download: { customName: isCustomName },
      repos: { customName: false },
    },
    defaultDomain: 'upload',
  },
}

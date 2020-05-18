module.exports = {
	local: {
		rootDir: process.env.TMS_FINDER_FS_ROOTDIR || 'storage', // 指定保存文件的目录
		outDir: process.env.TMS_FINDER_FS_OUTDIR || 'storage', // 指定系统生成文件存放目录
    domains: {
      upload: { customName: process.env.TMS_FINDER_FS_CUSTOMNAME || true },
      download: { customName: process.env.TMS_FINDER_FS_CUSTOMNAME || true }
    },
    defaultDomain: 'upload'
  }
}

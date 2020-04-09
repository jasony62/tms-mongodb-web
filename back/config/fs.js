module.exports = {
  local: {
    rootDir: process.env.TMS_FINDER_FS_ROOTDIR || 'storage',   // 指定保存文件的目录, 需在/data文件夹下建立/data/upload文件夹
    outDir: process.env.TMS_FINDER_FS_OUTDIR || 'storage'     //导出文件输出目录
  }
}
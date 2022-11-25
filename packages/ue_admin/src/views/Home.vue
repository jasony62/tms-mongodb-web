<template>
  <div class="flex flex-row gap-2 h-full">
    <div class="w-36 flex-none">
      <el-menu class="h-full overflow-auto" default-active="/database/" router>
        <el-menu-item index="/database/">
          <span>数据库</span>
        </el-menu-item>
        <el-menu-item index="/docSchemas/">
          <span>文档内容定义</span>
        </el-menu-item>
        <el-menu-item index="/dbSchemas/">
          <span>数据库属性定义</span>
        </el-menu-item>
        <el-menu-item index="/clSchemas/">
          <span>集合属性定义</span>
        </el-menu-item>
        <el-menu-item index="/tag/">
          <span>标签</span>
        </el-menu-item>
        <el-menu-item index="/replica/">
          <span>全量复制定义</span>
        </el-menu-item>
        <el-menu-item index="/files/">
          <span>文件管理</span>
        </el-menu-item>
      </el-menu>
    </div>
    <div class="flex-grow flex flex-col gap-2 mt-4 mx-4 h-full">
      <router-view></router-view>
    </div>
  </div>
</template>
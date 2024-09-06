<template>
  <view class="custom-page">
    <view v-if="props.isNavBar" class="navbar" :style="navBarstyle">
      <view class="nav-center" :style="{ top: `${useAppConfig.systemConfig.appletInfo.top}px` }">
        <view v-if="slots.navbarLeft" class="navbarLeft" :style="{ height: `${useAppConfig.systemConfig.appletInfo.height}px` }">
          <slot name="navbarLeft" :right-meunwidth="useAppConfig.systemConfig.appletInfo?.width" />
        </view>
        <view v-if="isback" class="navbarLeft" :style="{ height: `${useAppConfig.systemConfig.appletInfo.height}px` }" @click="backUp">
          <line-icon name="nine9-fanhui f-bold f-32 inline-block" :style="{ color: state.navigationColor }" />
        </view>
        <view
          v-if="slots.navbarCenter"
          class="navbarCenter flex transition"
          :style="{ zIndex: props.centerZindex, height: `${useAppConfig.systemConfig.appletInfo.height}px`, width: state.navbarcenterwidth }"
        >
          <slot name="navbarCenter" :rightmeun-height="useAppConfig.systemConfig.appletInfo.height" />
        </view>
        <view v-if="props.title" class="navbarCenter-title" :style="{ height: `${useAppConfig.systemConfig.appletInfo.height}px` }">
          <text v-if="state.opcity > 0.5" class="title u-line-1" :style="{ color: gradientFontColor }" @click="emit('click')">
            {{ title }}
          </text>
        </view>
        <view />
      </view>
    </view>
    <scroll-view
      v-if="props.isScrollPage"
      id="scrollRef"
      class="page-content relative"
      scroll-y
      scroll-anchoring
      scroll-with-animation
      enable-passive
      bounces
      :lower-threshold="props.lowerthreshold"
      :enhanced="props.isenhanced"
      :refresher-enabled="state.refresherEnabled"
      :show-scrollbar="false"
      :refresher-triggered="state.refresherState"
      :style="{ height: scrollHeight, background: props.scrollbg || '', ...props.costomstyle }"
      @scroll="onScroll"
      @scrolltolower="emit('onReachBottom')"
      @refresherrefresh="refresherpulling"
    >
      <u-skeleton :rows="useAppConfig.systemConfig.rows" :loading="state.pageLoading" :title="false">
        <slot />
        <slot name="content" :navbar-height="useAppConfig.systemConfig.navbarHeight" />
        <view v-if="props.safeAreaInsetBottom" class="safe-area-inset-bottom" />
      </u-skeleton>
    </scroll-view>
    <view v-else :style="{ minHeight: scrollHeight }">
      <u-skeleton :rows="useAppConfig.systemConfig.rows" :loading="state.pageLoading" :title="false">
        <slot />
        <slot name="content" :navbar-height="useAppConfig.systemConfig.navbarHeight" />
        <view v-if="props.safeAreaInsetBottom" class="safe-area-inset-bottom" />
      </u-skeleton>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue';
import { computed, getCurrentInstance, onMounted, provide, ref, useSlots, watch } from 'vue';
import { throttle } from 'lodash';
import useStore from '@/store';
import useState from '@/hooks/useState';
import lineHook from '@/hooks/uni-hook';
import { colorRgba, transColor } from '@/utils/tool';

export interface Isprops {
  title?: string; // 导航标题
  navigationColor?: string; // 导航字体颜色
  navigationbg?: string; // 导航背景颜色
  navigationbgImage?: string; // 导航背景图片
  isback?: boolean; // 是否开启返回
  backup?: () => boolean;
  pullDownRefresh?: () => void;
  throttleTime?: number; // 页面滚动防抖时间
  loading?: boolean; // 全屏骨架
  safeAreaInsetBottom?: boolean; // 是否开启底部安全区适配
  isNavBar?: boolean; // 是否需要navbar
  scrollH?: number; // 开始渐变滚动高度
  gradient?: boolean; // 是否开启状态栏渐变
  scrollbg?: string; // srcollview 背景
  state?: any; // 注入共享状态
  costomstyle?: CSSProperties; // css 外部样式
  isFixed?: boolean; // 是否需要为固定定位
  isopcity?: boolean; // 开启渐变时  是否只需要透明度变更
  centerZindex?: number;
  isScrollPage?: boolean; // 页面是否需要滚动
  isenhanced?: boolean; // 是否需要开启scroll-view 增强特性
  costomtabbar?: boolean; // 是否自定义tabbar
  lowerthreshold?: number; // 距离底部多少触发上拉加载
}
interface DataType {
  navbarcenterwidth: string;
  scrollTop: number;
  navigationColor: string;
  opcity: number;
  pageLoading: boolean;
  scrollH: number;
  iconOpcity: number;
  rgbObj: {
    red: number;
    green: number;
    blue: number;
  };
  navBarbg: string;
  colorRgba: {
    red: number;
    green: number;
    blue: number;
    rgba: string;
  };
  refresherState: boolean;
  refresherEnabled: boolean;
  scrollTopold: number;
}
const props = withDefaults(defineProps<Isprops>(), {
  title: '',
  navigationColor: '#333',
  navigationbg: '#fff',
  navigationbgImage: '',
  isback: true,
  isVirtual: false,
  VirtualItemHeight: 50,
  throttleTime: 80,
  loading: false,
  safeAreaInsetBottom: true,
  isNavBar: true,
  scrollH: 0,
  gradient: false,
  scrollbg: '',
  backup: () => true,
  state: {},
  isFixed: false,
  centerZindex: 98,
  pullDownRefresh: undefined,
  costomstyle: () => {
    return {};
  },
  isScrollPage: true,
  isenhanced: true,
  costomtabbar: false,
  lowerthreshold: 60,
});
const emit = defineEmits(['onReachBottom', 'onscroll', 'click']);
const instance = getCurrentInstance();
const { useAppConfig } = useStore();
const { router } = lineHook();
// 注入共享状态
provide('state', props.state);
const slots = ref(useSlots());
const { state, setData } = useState<DataType>({
  scrollTop: 0,
  // #ifdef H5
  navbarcenterwidth: 'calc(750rpx - 50px)',

  // #endif
  // #ifdef MP-WEIXIN
  // @ts-expect-error
  navbarcenterwidth: 'calc(750rpx - 140px)',
  // #endif
  navigationColor: props.navigationColor,
  navBarbg: props.navigationbg,
  iconOpcity: 1,
  opcity: props.gradient ? 0 : 1,
  scrollH: props.scrollH || useAppConfig.systemConfig.statusBarHeight + useAppConfig.systemConfig.appletInfo.height,
  pageLoading: props.loading,
  rgbObj: {
    red: 0,
    green: 0,
    blue: 0,
  },
  // 开启渐变才生效
  colorRgba: colorRgba(props.navigationColor, 0),
  refresherState: false, // 刷新状态
  refresherEnabled: !!props.pullDownRefresh, // 是否开启刷新
  scrollTopold: 0, // 记录下滚动条的位置
});

// navbar 样式
const navBarstyle = computed(() => {
  const style: CSSProperties = {
    height: `${useAppConfig.systemConfig.navbarHeight}px`,
    paddingTop: `${useAppConfig.systemConfig.statusBarHeight}px`,
    background: state.navBarbg,
    backgroundImage: props.navigationbgImage ? `url(${props.navigationbgImage})` : '',
    color: state.navigationColor,
    // @ts-expect-error
    position: props.isFixed ? 'fixed' : ' reactive',
  };
  return style;
});

// 返回
const backUp = async () => {
  if (typeof props?.backup == 'function') {
    const res: boolean = await props.backup();
    if (!res) {
      return;
    }
  }
  const pages = getCurrentPages();
  if (pages.length > 1) {
    router.back();
  }
  else {
    router.reLaunch('/pages/index/index');
  }
};
// 计算渐变字体颜色
const gradientFontColor = computed(() => {
  return `rgba(${state.colorRgba.red},${state.colorRgba.green},${state.colorRgba.blue},${state.opcity})`;
});
const scrollHeight = computed(() => {
  // `calc(100vh - ${props.isNavBar ? useAppConfig.systemConfig.navbarHeight : 0}px)`
  let height = 0;

  if (props.isNavBar && !props.isFixed) {
    height = useAppConfig.systemConfig.navbarHeight;
  }
  if (props.costomtabbar) {
    let iosSABottom = 0;
    // #ifdef H5
    iosSABottom = 51;
    // #endif
    return `calc(100vh - ${height}px - ${iosSABottom}px)`;
  }
  return `calc(100vh - ${height}px)`;
});
// 滚动到顶部
const scrollTop = (top?: number, timer?: number) => {
  const scrollview = uni.createSelectorQuery().in(instance).select('#scrollRef');
  scrollview
    .node((res) => {
      const view = res.node;
      view.scrollTo({ top: top || 0, animated: true, duration: timer || 300 });
    })
    .exec();
};
// 滚动事件
const onScroll = throttle((e: any) => {
  if (props.gradient) {
    const scroll = e.target.scrollTop <= 0 ? 0 : e.target.scrollTop || e.detail.scrollTop;
    const scrollH = uni.upx2px(state.scrollH);
    const opcity = scroll / scrollH;
    emit('onscroll', { e, opcity, iconOpcity: state.iconOpcity });
    if (state.opcity >= 1 && opcity >= 1) {
      return;
    }
    state.opcity = opcity > 1 ? 1 : opcity;
    state.iconOpcity = 0.5 * (1 - opcity < 0 ? 0 : 1 - opcity);
    const background = `rgba(${state.rgbObj.red}, ${state.rgbObj.green}, ${state.rgbObj.blue}, ${opcity})`;
    state.navBarbg = background;
  }
  else {
    emit('onscroll', e);
  }
}, props.throttleTime);
// 下拉刷新
const refresherpulling = async () => {
  try {
    state.refresherState = true;
    await props.pullDownRefresh?.();
  }
  finally {
    uni.$sleep(200, () => {
      state.refresherState = false;
    });
  }
};
watch(
  () => props.loading,
  (val) => {
    setData({ pageLoading: val });
  },
);
watch(
  () => props.navigationbg,
  val => (state.navBarbg = val),
);
watch(
  () => props.navigationColor,
  (val) => {
    state.navigationColor = val;
    state.colorRgba = colorRgba(val, 0);
  },
);

onMounted(() => {
  if (props.gradient) {
    const reg = /rgba/gi;
    // hex 颜色才开始转换
    const status = reg.test(props.navigationbg);

    if (status) {
      const rgbObj = transColor(props.navigationbg);
      const { red, green, blue, opcity = 1 } = rgbObj;
      setData({
        rgbObj: {
          red,
          green,
          blue,
        },
        opcity,
      });
    }
  }
  // 计算navbar 中间位置
  // #ifdef MP-WEIXIN
  const navbarcenterwidth = useAppConfig.systemConfig.screenWidth - useAppConfig.systemConfig.appletInfo.width - 14 - uni.upx2px(84);
  state.navbarcenterwidth = `${navbarcenterwidth}px`;
  // #endif
});
defineExpose({ scrollTop });
</script>

<style scoped lang="scss">
.custom-page {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
}

.navbar {
  z-index: 9999;
  box-sizing: border-box;
  background-size: 100% !important;
  position: relative;
  left: 0;
  top: 0;
  width: 100%;
}

.navbarLeft {
  color: #fff;
  flex-shrink: 0;
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  align-items: center;
  z-index: 100;
  padding: 0 12px;
  /* #ifdef H5 */
  width: 100%;
  box-sizing: border-box;
  z-index: 90;
  /* #endif */

  /* margin-top: 8rpx; */
}

.nav-center {
  display: flex;
  align-items: center;
  font-size: 30rpx;
  font-weight: 500;
  justify-content: flex-start;
  box-sizing: border-box;
  position: absolute;
  left: 0;
  width: 100%;
}

.navbarCenter {
  /* #ifndef MP-WEIXIN */
  width: calc(100vw - 100px);

  /* #endif */
  /* #ifdef MP-WEIXIN */
  width: 428rpx;
  /* #endif */
  margin-left: 42px;
  text-align: center;
  flex-shrink: 0;
}

.navbarCenter-title {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 50%;
  bottom: 0;
  top: 0;
  right: 0;
  z-index: 98;
  transform: translateX(-50%);
  /* #ifndef MP-WEIXIN */
  width: calc(100vw - 100px);

  /* #endif */
  /* #ifdef MP-WEIXIN */
  width: 420rpx;
  /* #endif */

  .title {
    max-width: 320rpx;
  }
}

.page-content {
  width: 100%;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
}

.item {
  height: 60rpx;
}
</style>

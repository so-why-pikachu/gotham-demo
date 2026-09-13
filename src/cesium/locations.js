// 位置和相机参数集中放置，方便学习与调参。
export const YULONG_MINE = {
  id: 'yulong-mine',
  name: '玉龙矿区',
  region: '西藏',
  mineType: '铜矿',
  longitude: 97.729167,
  latitude: 31.408333,
  markerColor: 'red',
};

// 新增点位复用玉龙矿区的 Entity、Point、Label 和距离显示配置。
export const ADDITIONAL_MINES = [
  {
    id: 'haerwusu-mine',
    name: '哈尔乌素露天煤矿',
    region: '内蒙古',
    mineType: '大型露天煤矿',
    longitude: 111.258324,
    latitude: 39.731044,
    markerColor: 'yellow',
  },
  {
    id: 'antaibao-mine',
    name: '平朔安太堡露天煤矿',
    region: '山西',
    mineType: '大型露天煤矿',
    longitude: 112.337930,
    latitude: 39.466011,
    markerColor: 'blue',
  },
  {
    id: 'zhujia-baobao-mine',
    name: '攀枝花朱家包包铁矿',
    region: '四川',
    mineType: '钒钛磁铁矿 / 铁矿',
    longitude: 101.753610,
    latitude: 26.633060,
    markerColor: 'yellow',
  },
];

export const MINE_LOCATIONS = [YULONG_MINE, ...ADDITIONAL_MINES];

// 全国尺度：高度故意保持在百万米级，保证初始视角能覆盖中国。
export const CHINA_VIEW = {
  longitude: 103.8,
  latitude: 35.5,
  height: 2_400_000,
  heading: 0,
  pitch: -90,
  roll: 0,
};

// 玉龙矿区局部尺度：20 km 位于任务要求的 10~30 km 范围内。
export const YULONG_VIEW = {
  longitude: YULONG_MINE.longitude,
  latitude: YULONG_MINE.latitude,
  height: 20_000,
  heading: 0,
  pitch: -52,
  roll: 0,
};

import { useEffect, useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Button, Image, Input, Picker, ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { api } from '../../services/api';
import type { HomeBanner } from '../../types/hotel';
import { afterDays, toIsoDay } from '../../utils/date';
import './index.scss';

const serviceItems = ['住宿', '机票', '机票+酒店', '高铁/火车', '民宿', '门票/体验', '租车', '包团'];
const quickCities = ['伦敦', '巴黎', '纽约', '东京', '新加坡', '悉尼'];

export default function HomePage() {
  const [city, setCity] = useState('Sydney');
  const [keyword, setKeyword] = useState('');
  const [checkIn, setCheckIn] = useState(toIsoDay(afterDays(1)).slice(0, 10));
  const [checkOut, setCheckOut] = useState(toIsoDay(afterDays(2)).slice(0, 10));
  const [minStar, setMinStar] = useState('');
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [featured, setFeatured] = useState<Array<{ id: string; name_cn: string; city: string; cover: string | null; rating: number | null; min_price: number | null }>>([]);

  useEffect(() => {
    Promise.all([api.getBanners(), api.getFeatured()])
      .then(([bs, fs]) => {
        setBanners(bs || []);
        setFeatured(fs || []);
      })
      .catch(() => {});
  }, []);

  const hotCards = useMemo(() => featured.slice(0, 6), [featured]);

  const getLocation = async () => {
    try {
      await Taro.getLocation({ type: 'gcj02' });
      Taro.showToast({ title: '定位成功，请手动确认城市', icon: 'none' });
    } catch {
      Taro.showToast({ title: '定位失败，请手动输入城市', icon: 'none' });
    }
  };

  const onSearch = (preferredKeyword?: string) => {
    if (new Date(toIsoDay(checkOut)) <= new Date(toIsoDay(checkIn))) {
      Taro.showToast({ title: '离店日期必须晚于入住', icon: 'none' });
      return;
    }

    const q: Record<string, string> = {
      city: city || keyword || preferredKeyword || '',
      keyword: preferredKeyword || keyword,
      check_in: toIsoDay(checkIn),
      check_out: toIsoDay(checkOut),
      rooms_count: '1',
      page: '1',
      limit: '20',
      sort: 'recommended',
    };
    if (minStar) q.min_star = minStar;

    const query = Object.entries(q)
      .filter(([, v]) => v !== '' && v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    Taro.navigateTo({ url: `/pages/hotel-list/index?${query}` });
  };

  return (
    <View className='home'>
      <View className='hero'>
        <View className='topbar'>
          <View className='brand'>Trip.com</View>
          <View className='member'>银级会员</View>
        </View>

        <View className='service-card'>
          <View className='service-grid'>
            {serviceItems.map((s) => (
              <View key={s} className='service-item'>
                <View className='service-icon'>◉</View>
                <Text>{s}</Text>
              </View>
            ))}
          </View>

          <View className='search-box' onClick={() => Taro.navigateTo({ url: '/pages/search/index' })}>
            <Text style='font-size:26px'>🤖 想去哪？</Text>
            <Text className='go'>🔎</Text>
          </View>

          <View className='chips'>
            {quickCities.map((c) => (
              <View key={c} className='chip' onClick={() => onSearch(c)}>
                {c}
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className='query-card card'>
        <View className='query-row'>
          <Input className='input' value={city} onInput={(e) => setCity(e.detail.value)} placeholder='当前地点' />
          <Button className='lite-btn' onClick={getLocation}>定位</Button>
        </View>
        <Input className='input' value={keyword} onInput={(e) => setKeyword(e.detail.value)} placeholder='关键字搜索：酒店名/地标' />
        <View className='date-row'>
          <Picker mode='date' value={checkIn} onChange={(e) => setCheckIn(e.detail.value)}>
            <View className='input'>{checkIn}</View>
          </Picker>
          <Picker mode='date' value={checkOut} onChange={(e) => setCheckOut(e.detail.value)}>
            <View className='input'>{checkOut}</View>
          </Picker>
        </View>
        <Picker mode='selector' range={['不限', '2星+', '3星+', '4星+', '5星']} onChange={(e) => setMinStar(e.detail.value === 0 ? '' : String(e.detail.value + 1))}>
          <View className='input'>{minStar ? `${minStar}星+` : '筛选条件（星级）'}</View>
        </Picker>
        <Button className='primary-btn search-btn' onClick={() => onSearch()}>查询酒店</Button>
      </View>

      {!!banners.length && (
        <View className='banner-wrap'>
          <Swiper circular autoplay indicatorDots>
            {banners.map((b) => (
              <SwiperItem key={b.id}>
                <View className='ad-card' onClick={() => Taro.navigateTo({ url: `/pages/hotel-detail/index?id=${b.id}` })}>
                  <Image src={b.image || 'https://picsum.photos/seed/banner/900/380'} mode='aspectFill' />
                  <View className='ad-mask'>
                    <View className='ad-title'>{b.title}</View>
                    <View className='ad-sub'>{b.subtitle}</View>
                  </View>
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        </View>
      )}

      <View className='feeds'>
        <View className='section-title' style='margin-bottom:10px'>热门推荐</View>
        <View className='masonry'>
          {hotCards.map((h) => (
            <View key={h.id} className='feed-card' onClick={() => Taro.navigateTo({ url: `/pages/hotel-detail/index?id=${h.id}` })}>
              <Image src={h.cover || 'https://picsum.photos/seed/hotel-cover/800/400'} mode='aspectFill' />
              <View className='feed-body'>
                <View className='feed-name'>{h.name_cn}</View>
                <View className='muted'>{h.city} · 评分 {h.rating?.toFixed(1) || '-'}</View>
                <View className='feed-price'>AUD {Math.round((h.min_price || 0) / 100)}</View>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className='tabbar'>
        <View className='tab active'>主页</View>
        <View className='tab'>消息</View>
        <View className='tab plus'>＋</View>
        <View className='tab'>行程</View>
        <View className='tab'>帐户</View>
      </View>
    </View>
  );
}

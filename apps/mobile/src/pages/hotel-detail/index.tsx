import { useEffect, useMemo, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { Button, Image, ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { api } from '../../services/api';
import type { HotelCalendarResponse, ReviewSummary } from '../../types/hotel';
import { dayLabel } from '../../utils/date';
import './index.scss';

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T00:00:00.000Z`;
}

function nextDay(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + 1);
  return toIsoDate(d);
}

export default function HotelDetailPage() {
  const router = useRouter();
  const hotelId = router.params.id || '';
  const [detail, setDetail] = useState<any>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [calendar, setCalendar] = useState<HotelCalendarResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [openDateSheet, setOpenDateSheet] = useState(false);

  const initialIn = router.params.check_in || toIsoDate(new Date());
  const initialOut = router.params.check_out || nextDay(initialIn);
  const [selectedIn, setSelectedIn] = useState(initialIn);
  const [selectedOut, setSelectedOut] = useState(initialOut);
  const [selectedRooms, setSelectedRooms] = useState(Number(router.params.rooms_count || 1));

  useEffect(() => {
    if (!hotelId) return;
    setLoading(true);
    Promise.all([
      api.getHotelDetail(hotelId, {
        check_in: selectedIn,
        check_out: selectedOut,
        rooms_count: selectedRooms,
      }),
      api.getReviewSummary(hotelId),
    ])
      .then(([d, s]) => {
        setDetail(d);
        setSummary(s);
      })
      .catch(() => Taro.showToast({ title: '加载详情失败', icon: 'none' }))
      .finally(() => setLoading(false));

    const month = selectedIn ? selectedIn.slice(0, 7) : new Date().toISOString().slice(0, 7);
    api.getHotelCalendar(hotelId, month).then(setCalendar).catch(() => {});
  }, [hotelId, selectedIn, selectedOut, selectedRooms]);

  const imageList = useMemo(
    () => (detail?.hotel_images?.length ? detail.hotel_images : [{ url: 'https://picsum.photos/seed/detail-fallback/900/600' }]),
    [detail],
  );

  const goOfferPage = (checkIn: string, checkOut: string) => {
    Taro.navigateTo({
      url: `/pages/room-offers/index?hotelId=${hotelId}&check_in=${encodeURIComponent(checkIn)}&check_out=${encodeURIComponent(checkOut)}&rooms_count=${selectedRooms}`,
    });
  };

  return (
    <View className='detail'>
      <View className='hero'>
        <Swiper circular autoplay>
          {imageList.map((img: any, idx: number) => (
            <SwiperItem key={idx}>
              <Image src={img.url} mode='aspectFill' />
            </SwiperItem>
          ))}
        </Swiper>
        <View className='hero-top'>
          <View className='c-btn' onClick={() => Taro.navigateBack()}>
            ←
          </View>
          <View style='display:flex;gap:8px'>
            <View className='c-btn'>♡</View>
            <View className='c-btn'>↗</View>
          </View>
        </View>
      </View>

      <View className='info-card'>
        <View className='h-name'>{detail?.name_cn || '加载中...'}</View>
        <View className='subtitle'>{detail?.name_en || ''}</View>
        <View className='subtitle'>{detail?.address || ''}</View>
        <View className='score' style='margin-top:8px'>
          <Text className='score-pill'>{(summary?.rating ?? detail?.review_summary?.rating ?? 0).toFixed(1)}/10</Text>
          <Text>{summary?.grade || '很好'}</Text>
          <Text className='muted'>{summary?.review_count || detail?.review_summary?.review_count || 0}则评价</Text>
        </View>
      </View>

      <View className='section'>
        <View className='section-title'>酒店基础信息</View>
        <View className='subtitle'>星级：{'★'.repeat(detail?.star || 0)}</View>
        <View className='tag-grid'>
          {(detail?.hotel_tags || []).slice(0, 8).map((t: any) => (
            <View key={t.id || t.tag} className='tag-item'>
              ✓ {t.tag}
            </View>
          ))}
        </View>
      </View>

      <View className='section'>
        <View className='section-title'>日历 + 人间夜</View>
        <View className='booking-banner' onClick={() => setOpenDateSheet(true)}>
          <View>
            <View className='subtitle'>入住及退房</View>
            <View className='banner-main'>
              {dayLabel(selectedIn)} - {dayLabel(selectedOut)}
            </View>
          </View>
          <View>
            <View className='subtitle'>房间及住客</View>
            <View className='banner-main'>{selectedRooms} 间</View>
          </View>
        </View>

        {!!calendar?.days?.length && (
          <View className='date-suggest'>
            <View className='muted'>若当前日期紧张，可考虑以下低价日期：</View>
            <View className='date-chip-row'>
              {calendar.days
                .filter((d) => d.is_available && d.min_price !== null)
                .sort((a, b) => (a.min_price || 0) - (b.min_price || 0))
                .slice(0, 4)
                .map((d) => {
                  const inIso = `${d.date}T00:00:00.000Z`;
                  const outIso = nextDay(inIso);
                  return (
                    <View
                      key={d.date}
                      className='date-chip'
                      onClick={() => {
                        setSelectedIn(inIso);
                        setSelectedOut(outIso);
                      }}
                    >
                      <View style='font-size:24px;font-weight:700'>{d.date.slice(5)}</View>
                      <View style='color:#2f55e7;font-size:26px;font-weight:700'>AUD {Math.round((d.min_price || 0) / 100)}</View>
                    </View>
                  );
                })}
            </View>
          </View>
        )}

        <Button className='primary-btn' style='margin-top:10px' onClick={() => goOfferPage(selectedIn, selectedOut)}>
          搜索房型价格
        </Button>
      </View>

      <View className='section'>
        <View className='section-title'>房型价格列表（低到高）</View>
        <ScrollView scrollY style='max-height: 320px;'>
          {(detail?.room_price_list || []).map((r: any) => (
            <View key={r.room_id} style='border-bottom:1px solid #eef1f6;padding:8px 0'>
              <View style='font-size:28px;font-weight:700'>{r.room_name}</View>
              <View className='muted'>可住 {r.max_occupancy} 人 · 可售 {r.available_rooms} 间</View>
              <View style='color:#2f55e7;font-size:32px;font-weight:800'>AUD {Math.round((r.base_price || 0) / 100)}</View>
            </View>
          ))}
          {loading && <View className='muted' style='padding:8px 0'>加载中...</View>}
        </ScrollView>
      </View>

      {openDateSheet && <View className='mask' onClick={() => setOpenDateSheet(false)} />}
      {openDateSheet && (
        <View className='sheet'>
          <View className='sheet-head'>
            <Text>选择日期和房间</Text>
            <Text onClick={() => setOpenDateSheet(false)}>关闭</Text>
          </View>
          <View className='form-block'>
            <View className='subtitle'>快捷日期（基于价格日历）</View>
            <View className='date-chip-row'>
              {(calendar?.days || [])
                .filter((d) => d.is_available)
                .slice(0, 10)
                .map((d) => {
                  const inIso = `${d.date}T00:00:00.000Z`;
                  const outIso = nextDay(inIso);
                  const active = selectedIn.startsWith(d.date);
                  return (
                    <View
                      key={d.date}
                      className={`date-chip ${active ? 'active-chip' : ''}`}
                      onClick={() => {
                        setSelectedIn(inIso);
                        setSelectedOut(outIso);
                      }}
                    >
                      <View style='font-size:24px'>{d.date.slice(5)}</View>
                      <View style='font-size:24px;font-weight:700'>AUD {Math.round((d.min_price || 0) / 100)}</View>
                    </View>
                  );
                })}
            </View>

            <View className='room-counter'>
              <Text>房间数量</Text>
              <View className='counter-btns'>
                <View className='counter-btn' onClick={() => setSelectedRooms((v) => Math.max(1, v - 1))}>
                  -
                </View>
                <Text>{selectedRooms}</Text>
                <View className='counter-btn' onClick={() => setSelectedRooms((v) => Math.min(5, v + 1))}>
                  +
                </View>
              </View>
            </View>

            <Button className='primary-btn' onClick={() => setOpenDateSheet(false)}>
              确认
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

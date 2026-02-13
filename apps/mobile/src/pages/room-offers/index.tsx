import { useEffect, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { Button, Image, ScrollView, Text, View } from '@tarojs/components';
import type { HotelOffer, HotelOffersResponse } from '../../types/hotel';
import { api } from '../../services/api';
import { dayLabel } from '../../utils/date';
import './index.scss';

export default function RoomOffersPage() {
  const router = useRouter();
  const hotelId = router.params.hotelId || '';
  const checkIn = router.params.check_in || '';
  const checkOut = router.params.check_out || '';
  const roomsCount = Number(router.params.rooms_count || 1);

  const [offers, setOffers] = useState<HotelOffersResponse | null>(null);
  const [hotelName, setHotelName] = useState('');
  const [activeOffer, setActiveOffer] = useState<HotelOffer | null>(null);

  useEffect(() => {
    if (!hotelId) return;
    Promise.all([
      api.getHotelOffers(hotelId, { check_in: checkIn, check_out: checkOut, rooms_count: roomsCount }),
      api.getHotelDetail(hotelId, { check_in: checkIn, check_out: checkOut, rooms_count: roomsCount }),
    ])
      .then(([data, detail]) => {
        setOffers(data);
        setHotelName(detail?.name_cn || '酒店');
      })
      .catch(() => Taro.showToast({ title: '加载房型失败', icon: 'none' }));
  }, [hotelId, checkIn, checkOut, roomsCount]);

  return (
    <View className='offers'>
      <View className='topbar'>
        <View onClick={() => Taro.navigateBack()}>←</View>
        <View>{hotelName}</View>
        <View>♡</View>
      </View>

      <View className='card' style='margin:12px;padding:12px;'>
        <View>
          {dayLabel(checkIn)} - {dayLabel(checkOut)} · {roomsCount}间 · 1晚
        </View>
      </View>

      <ScrollView scrollY style='height: calc(100vh - 170px)'>
        {(offers?.items || []).map((item) => (
          <View className='offer-card' key={item.room_id}>
            <Image src='https://picsum.photos/seed/offer/900/500' mode='aspectFill' />
            <View className='offer-body'>
              <View className='offer-name'>{item.room_name}</View>
              <View className='offer-meta'>
                最多 {item.max_occupancy} 人 · {item.breakfast ? '含早餐' : '不含早餐'} · {item.refundable ? '可退款' : '不可退款'}
              </View>
              <View className='offer-meta'>剩余 {item.available_rooms} 间</View>
              <View className='offer-links'>
                <Text onClick={() => setActiveOffer(item)}>价格详情</Text>
                <Text>房间设施</Text>
              </View>
              <View className='offer-bottom'>
                <View>
                  <View className='muted'>总额（{item.nights}晚）</View>
                  <View className='offer-price'>AUD {Math.round(item.total_price / 100)}</View>
                </View>
                <Button
                  className='primary-btn'
                  style='width:170px;padding:10px 0;font-size:28px'
                  disabled={!item.is_available}
                  onClick={() =>
                    Taro.navigateTo({
                      url: `/pages/booking/index?hotelId=${hotelId}&roomId=${item.room_id}&check_in=${encodeURIComponent(checkIn)}&check_out=${encodeURIComponent(checkOut)}&rooms_count=${roomsCount}&total_price=${item.total_price}`,
                    })
                  }
                >
                  {item.is_available ? '预订' : '售罄'}
                </Button>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {!!activeOffer && <View className='mask' onClick={() => setActiveOffer(null)} />}
      {!!activeOffer && (
        <View className='sheet'>
          <View className='sheet-head'>
            <Text>{activeOffer.room_name}</Text>
            <Text onClick={() => setActiveOffer(null)}>关闭</Text>
          </View>
          <View className='sheet-body'>
            <View className='sheet-row'>
              <Text>1个床位 x {activeOffer.nights}晚</Text>
              <Text>AUD {(activeOffer.nightly_price / 100).toFixed(2)}</Text>
            </View>
            <View className='sheet-row'>
              <Text>税费</Text>
              <Text>AUD {((activeOffer.total_price - activeOffer.nightly_price) / 100).toFixed(2)}</Text>
            </View>
            <View className='sheet-row total'>
              <Text>总价</Text>
              <Text>AUD {(activeOffer.total_price / 100).toFixed(2)}</Text>
            </View>
            <View className='sheet-tip'>
              {activeOffer.refundable ? '支持免费取消' : '此价格不可退款'} · {activeOffer.breakfast ? '包含早餐' : '不含早餐'}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

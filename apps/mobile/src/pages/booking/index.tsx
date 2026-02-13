import { useEffect, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { Button, Checkbox, Input, ScrollView, Text, View } from '@tarojs/components';
import { api } from '../../services/api';
import { dayLabel } from '../../utils/date';
import './index.scss';

export default function BookingPage() {
  const router = useRouter();
  const hotelId = router.params.hotelId || '';
  const roomId = router.params.roomId || '';
  const checkIn = router.params.check_in || '';
  const checkOut = router.params.check_out || '';
  const roomsCount = Number(router.params.rooms_count || 1);
  const totalPrice = Number(router.params.total_price || 0);

  const [hotelName, setHotelName] = useState('酒店');
  const [roomName, setRoomName] = useState('房型');
  const [contactName, setContactName] = useState('GAN RUNQING');
  const [email, setEmail] = useState('runqinggan@gmail.com');
  const [phone, setPhone] = useState('0466120541');
  const [quietRoom, setQuietRoom] = useState(false);
  const [nonSmoking, setNonSmoking] = useState(false);
  const [highFloor, setHighFloor] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hotelId) return;
    api
      .getHotelDetail(hotelId, { check_in: checkIn, check_out: checkOut, rooms_count: roomsCount })
      .then((d: any) => {
        setHotelName(d?.name_cn || '酒店');
        const matched = (d?.room_price_list || []).find((r: any) => r.room_id === roomId);
        if (matched?.room_name) setRoomName(matched.room_name);
      })
      .catch(() => {});
  }, [hotelId, checkIn, checkOut, roomsCount, roomId]);

  const onSubmit = async () => {
    if (!contactName || !phone) {
      Taro.showToast({ title: '请填写住客和电话', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.createBooking({
        hotel_id: hotelId,
        room_id: roomId,
        check_in: checkIn,
        check_out: checkOut,
        rooms_count: roomsCount,
        guest_count: 1,
        contact_name: contactName,
        contact_phone: phone,
      });
      Taro.showModal({
        title: '预订成功',
        content: `订单号：${result.id}`,
        showCancel: false,
        success: () => (Taro.switchTab ? Taro.reLaunch({ url: '/pages/home/index' }) : Taro.navigateBack({ delta: 10 })),
      });
    } catch {
      Taro.showToast({ title: '预订失败，请稍后重试', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className='booking'>
      <View className='top'>
        <View style='display:flex;align-items:center;gap:8px'>
          <View onClick={() => Taro.navigateBack()}>←</View>
          <View style='font-size:34px;font-weight:700'>{hotelName}</View>
        </View>
      </View>

      <View className='block head-card'>
        <View className='block-b'>
          <View className='date-row'>
            <View>
              <View className='muted'>入住</View>
              <View className='title-strong'>{dayLabel(checkIn)}</View>
            </View>
            <View className='night'>1晚</View>
            <View style='text-align:right'>
              <View className='muted'>退房</View>
              <View className='title-strong'>{dayLabel(checkOut)}</View>
            </View>
          </View>
          <View className='room-line'>
            <Text>{roomName}</Text>
            <Text className='muted'>禁烟 · 不设退款</Text>
          </View>
        </View>
      </View>

      <View className='block'>
        <View className='block-h'>房间非常受欢迎，立即完成预订</View>
        <View className='block-b muted'>即时确认 · 最低价格保证</View>
      </View>

      <ScrollView scrollY style='height: calc(100vh - 340px)'>
        <View className='block'>
          <View className='block-h'>住客资料</View>
          <View className='block-b'>
            <View className='row'>
              <Input
                className='inp'
                value={contactName.split(' ')[0] || ''}
                onInput={(e) => setContactName(`${e.detail.value} ${contactName.split(' ')[1] || ''}`.trim())}
                placeholder='姓'
              />
              <Input
                className='inp'
                value={contactName.split(' ')[1] || ''}
                onInput={(e) => setContactName(`${contactName.split(' ')[0] || ''} ${e.detail.value}`.trim())}
                placeholder='名'
              />
            </View>
            <Input className='inp' value={email} onInput={(e) => setEmail(e.detail.value)} placeholder='电子邮件' />
            <Input className='inp' value={phone} onInput={(e) => setPhone(e.detail.value)} placeholder='手机' />
          </View>
        </View>

        <View className='block'>
          <View className='block-h'>特别要求（选填）</View>
          <View className='block-b'>
            <View>
              <Checkbox checked={quietRoom} onClick={() => setQuietRoom((v) => !v)} /> 安静房间
            </View>
            <View style='margin-top:10px'>
              <Checkbox checked={nonSmoking} onClick={() => setNonSmoking((v) => !v)} /> 需要无烟处理
            </View>
            <View style='margin-top:10px'>
              <Checkbox checked={highFloor} onClick={() => setHighFloor((v) => !v)} /> 非角落房间
            </View>
            <View className='muted' style='margin-top:12px'>
              酒店将尽力满足需求，但不保证成功。
            </View>
          </View>
        </View>

        <View className='block'>
          <View className='block-h'>重要资讯</View>
          <View className='block-b'>
            <View className='info-list'>
              <View>• 18岁以下旅客需由监护人陪同入住。</View>
              <View>• 若超过办理入住时间，请提前联系酒店。</View>
              <View>• 部分房型不允许儿童入住，请以房型说明为准。</View>
            </View>
          </View>
        </View>

        <View className='block'>
          <View className='block-h'>优惠代码</View>
          <View className='line-item'>
            <Text className='muted'>请输入优惠代码</Text>
            <Text>›</Text>
          </View>
        </View>

        <View className='block'>
          <View className='block-h'>Trip Coins</View>
          <View className='block-b'>
            <View style='font-size:28px;color:#9a6700;font-weight:700'>赚取 195 Trip Coins（约 AUD2.76）</View>
            <View className='muted' style='margin-top:8px'>
              消费后积分将返还至账户，可用于下次订单抵扣。
            </View>
          </View>
        </View>
      </ScrollView>

      <View className='fixed-bar'>
        <View className='fixed-inner'>
          <View>
            <View className='muted'>网上预付</View>
            <View className='price'>AUD {(totalPrice / 100).toFixed(2)}</View>
          </View>
          <Button className='primary-btn' style='width:220px' loading={submitting} onClick={onSubmit}>
            预订
          </Button>
        </View>
      </View>
    </View>
  );
}

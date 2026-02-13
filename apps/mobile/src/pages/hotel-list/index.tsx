import { useEffect, useMemo, useState } from 'react';
import Taro, { usePullDownRefresh, useReachBottom, useRouter } from '@tarojs/taro';
import { Button, Image, Input, ScrollView, Text, View } from '@tarojs/components';
import type { FilterMetadata, HotelItem, HotelListQuery } from '../../types/hotel';
import { api } from '../../services/api';
import './index.scss';

type SheetType = 'sort' | 'filter' | 'location' | 'price' | null;

const sortOptions = [
  { value: 'recommended', label: 'Trip.com 推荐' },
  { value: 'price_asc', label: '最低价格（连税后）' },
  { value: 'price_desc', label: '最高价格（连税后）' },
  { value: 'rating_desc', label: '热门评价' },
  { value: 'star_desc', label: '星级（由高至低）' },
];

function shortDate(v?: string) {
  if (!v) return '--';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v.slice(5, 10);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function HotelListPage() {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetType>(null);
  const [items, setItems] = useState<HotelItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [meta, setMeta] = useState<FilterMetadata | null>(null);
  const [query, setQuery] = useState<HotelListQuery>({
    city: router.params.city || '',
    keyword: router.params.keyword || '',
    check_in: router.params.check_in,
    check_out: router.params.check_out,
    rooms_count: Number(router.params.rooms_count || 1),
    page: 1,
    limit: 10,
    sort: 'recommended',
  });

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minStar, setMinStar] = useState('');
  const [minRating, setMinRating] = useState('');
  const [breakfast, setBreakfast] = useState(false);
  const [refundable, setRefundable] = useState(false);

  const headerText = useMemo(
    () => `${query.city || query.keyword || '目的地'} · ${shortDate(query.check_in)} ~ ${shortDate(query.check_out)}`,
    [query],
  );

  const fetchHotels = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const nextPage = reset ? 1 : query.page || 1;
      const data = await api.getHotels({ ...query, page: nextPage });
      const merged = reset ? data.items : [...items, ...data.items];
      setItems(merged);
      setTotal(data.total);
      setHasMore(merged.length < data.total);
      setQuery((prev) => ({ ...prev, page: nextPage + 1 }));
    } catch {
      Taro.showToast({ title: '加载酒店失败', icon: 'none' });
    } finally {
      setLoading(false);
      Taro.stopPullDownRefresh();
    }
  };

  useEffect(() => {
    fetchHotels(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    query.sort,
    query.city,
    query.keyword,
    query.check_in,
    query.check_out,
    query.min_price,
    query.max_price,
    query.min_star,
    query.min_rating,
    query.breakfast,
    query.refundable,
  ]);

  useEffect(() => {
    api.getFilterMetadata(query.city).then(setMeta).catch(() => {});
  }, [query.city]);

  useReachBottom(() => {
    if (hasMore) fetchHotels(false);
  });

  usePullDownRefresh(() => {
    fetchHotels(true);
  });

  const applyFilter = () => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
      min_star: minStar ? Number(minStar) : undefined,
      min_rating: minRating ? Number(minRating) : undefined,
      breakfast,
      refundable,
    }));
    setSheet(null);
  };

  const quickFilters = useMemo(
    () => (meta?.popular_tags?.length ? meta.popular_tags.slice(0, 8).map((t) => t.tag) : ['2张床', '可泊车', '包含早餐', '免费取消', '民宿及公寓']),
    [meta],
  );

  return (
    <View className='list-page'>
      <View className='top'>
        <View className='query'>
          <View className='query-main'>
            <Text className='query-date'>
              {shortDate(query.check_in)} - {shortDate(query.check_out)}
            </Text>
            <Text className='query-city'>{query.city || query.keyword || '目的地'}</Text>
          </View>
          <Text className='query-back' onClick={() => Taro.navigateBack()}>
            返回
          </Text>
        </View>
        <View className='filter-row'>
          <View className='filter-btn' onClick={() => setSheet('sort')}>
            排序
          </View>
          <View className='filter-btn' onClick={() => setSheet('filter')}>
            筛选
          </View>
          <View className='filter-btn' onClick={() => setSheet('location')}>
            位置
          </View>
          <View className='filter-btn' onClick={() => setSheet('price')}>
            价格
          </View>
        </View>
      </View>

      <View className='list-wrap'>
        <View className='map-box'>
          <View className='map-pin' style='top:42px;left:36%'>🏨</View>
          <View className='map-pin' style='top:94px;left:60%'>🏨</View>
          <View className='map-pin' style='top:144px;left:50%'>🏨</View>
          <View className='map-btn'>地图</View>
        </View>

        <View className='coupon'>
          <View className='coupon-head'>
            <Text>观光客专享优惠</Text>
            <Text style='color:#2f55e7'>领取所有</Text>
          </View>
          <View className='coupon-row'>
            <View className='coupon-item'>高达 AUD20 优惠</View>
            <View className='coupon-item'>高达 AUD18 优惠</View>
            <View className='coupon-item'>高达 75 折</View>
          </View>
        </View>

        <View style='font-size:30px;font-weight:700;margin:6px 0 10px'>找到 {total} 间住宿</View>

        <View className='quick-row'>
          {quickFilters.map((label) => (
            <View
              key={label}
              className='quick-chip'
              onClick={() => setQuery((prev) => ({ ...prev, keyword: `${prev.keyword || ''} ${label}`.trim(), page: 1 }))}
            >
              {label}
            </View>
          ))}
        </View>

        <ScrollView scrollY style='height: calc(100vh - 460px)'>
          {items.map((h) => (
            <View
              className='hotel-card'
              key={h.id}
              onClick={() =>
                Taro.navigateTo({
                  url: `/pages/hotel-detail/index?id=${h.id}&check_in=${encodeURIComponent(query.check_in || '')}&check_out=${encodeURIComponent(query.check_out || '')}&rooms_count=${query.rooms_count || 1}`,
                })
              }
            >
              <Image src={h.hotel_images?.[0]?.url || 'https://picsum.photos/seed/list/900/500'} mode='aspectFill' />
              <View className='hotel-body'>
                <View className='h-name'>{h.name_cn}</View>
                <View className='h-meta'>
                  {h.city} · 评分 {(h.review_summary?.rating ?? 0).toFixed(1)} · {h.address}
                </View>
                <View className='h-price'>AUD {Math.round((h.min_nightly_price ?? h.rooms?.[0]?.base_price ?? 0) / 100)}</View>
              </View>
            </View>
          ))}
          <View className='muted' style='text-align:center;padding:12px 0'>
            {loading ? '加载中...' : hasMore ? '上滑加载更多' : '没有更多了'}
          </View>
        </ScrollView>
      </View>

      {sheet && <View className='mask' onClick={() => setSheet(null)} />}
      {sheet === 'sort' && (
        <View className='sheet'>
          <View className='sheet-head'>
            <Text>排序</Text>
            <Text onClick={() => setSheet(null)}>关闭</Text>
          </View>
          {sortOptions.map((s) => (
            <View
              key={s.value}
              className={`option ${query.sort === s.value ? 'active' : ''}`}
              onClick={() => {
                setQuery((prev) => ({ ...prev, sort: s.value as HotelListQuery['sort'], page: 1 }));
                setSheet(null);
              }}
            >
              {s.label}
            </View>
          ))}
        </View>
      )}

      {sheet === 'filter' && (
        <View className='sheet'>
          <View className='sheet-head'>
            <Text>筛选</Text>
            <Text onClick={() => setSheet(null)}>关闭</Text>
          </View>
          <View className='form-block'>
            <Input className='inp' type='number' placeholder='最低星级，如4' value={minStar} onInput={(e) => setMinStar(e.detail.value)} />
            <Input className='inp' type='number' placeholder='最低评分，如8' value={minRating} onInput={(e) => setMinRating(e.detail.value)} />
            {!!meta?.star_counts?.length && (
              <View className='mini-stars'>
                {meta.star_counts.map((s) => (
                  <View key={s.star} className='mini-star' onClick={() => setMinStar(String(s.star))}>
                    {s.star}星+ ({s.count})
                  </View>
                ))}
              </View>
            )}
            <View className='option' style='border:none;padding:6px 0' onClick={() => setBreakfast((v) => !v)}>
              <Text>{breakfast ? '☑' : '☐'} 包含早餐</Text>
            </View>
            <View className='option' style='border:none;padding:6px 0' onClick={() => setRefundable((v) => !v)}>
              <Text>{refundable ? '☑' : '☐'} 免费取消 / 可退款</Text>
            </View>
            <Button className='primary-btn' onClick={applyFilter}>
              显示结果
            </Button>
          </View>
        </View>
      )}

      {sheet === 'location' && (
        <View className='sheet'>
          <View className='sheet-head'>
            <Text>酒店位置</Text>
            <Text onClick={() => setSheet(null)}>关闭</Text>
          </View>
          <View className='form-block'>
            <Input
              className='inp'
              placeholder='城市 / 地区'
              value={query.city || ''}
              onInput={(e) => setQuery((prev) => ({ ...prev, city: e.detail.value, page: 1 }))}
            />
            <Button className='primary-btn' onClick={() => setSheet(null)}>
              显示结果
            </Button>
          </View>
        </View>
      )}

      {sheet === 'price' && (
        <View className='sheet'>
          <View className='sheet-head'>
            <Text>价格（1晚）</Text>
            <Text onClick={() => setSheet(null)}>关闭</Text>
          </View>
          <View className='form-block'>
            <Input className='inp' type='number' placeholder='最低价（分）' value={minPrice} onInput={(e) => setMinPrice(e.detail.value)} />
            <Input className='inp' type='number' placeholder='最高价（分）' value={maxPrice} onInput={(e) => setMaxPrice(e.detail.value)} />
            {!!meta && (
              <View className='muted' style='margin-bottom:10px'>
                当前城市价格区间：AUD {Math.round(meta.price_range.min / 100)} - {Math.round(meta.price_range.max / 100)}
              </View>
            )}
            <Button className='primary-btn' onClick={applyFilter}>
              显示结果
            </Button>
          </View>
        </View>
      )}

      <View className='float-tip'>{headerText}</View>
    </View>
  );
}

import { View, Text, ScrollView, Input, Button } from '@tarojs/components'
import Taro, { useReachBottom } from '@tarojs/taro'
import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import './hotelList.css'
import { api } from '../../utils/api'

const CITY_OPTIONS = ['上海', '北京', '广州', '深圳', '杭州', '成都', '东京', '新加坡']

const sortOptions = [
  { value: 'recommended', label: '综合推荐' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' },
  { value: 'rating_desc', label: '评分优先' },
  { value: 'star_desc', label: '星级从高到低' }
]

const nearbyExamplesByCity = {
  上海: ['人民广场', '陆家嘴', '外滩', '南京路', '静安寺'],
  北京: ['国贸', '王府井', '故宫', '天安门', '三里屯'],
  广州: ['珠江新城', '广州塔', '体育西路', '沙面'],
  深圳: ['福田', '车公庙', '深圳湾', '世界之窗'],
  杭州: ['西湖', '龙翔桥', '灵隐寺', '河坊街'],
  成都: ['春熙路', '天府广场', '武侯祠', '宽窄巷子'],
  东京: ['银座', '新宿', '涩谷', '浅草寺'],
  新加坡: ['滨海湾', '乌节路', '鱼尾狮', '克拉码头']
}

function decodeParam(value) {
  if (typeof value !== 'string' || value === '') return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeStayDates(rawCheckIn, rawCheckOut) {
  const today = dayjs().startOf('day')
  let inDay = dayjs(rawCheckIn || today.format('YYYY-MM-DD'))
  let outDay = dayjs(rawCheckOut || today.add(1, 'day').format('YYYY-MM-DD'))
  if (!inDay.isValid() || inDay.isBefore(today, 'day')) inDay = today
  if (!outDay.isValid() || !outDay.isAfter(inDay, 'day')) outDay = inDay.add(1, 'day')
  return {
    checkIn: inDay.format('YYYY-MM-DD'),
    checkOut: outDay.format('YYYY-MM-DD'),
  }
}

function clampText(value, max = 24) {
  return String(value ?? '')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .slice(0, max)
}

function clampDigits(value, max = 7) {
  return String(value ?? '')
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, max)
}

function centsToYuanText(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return ''
  return String(Math.round(n / 100))
}

function yuanToCentsText(value) {
  const n = Number(String(value || '').trim())
  if (!Number.isFinite(n) || n <= 0) return ''
  return String(Math.round(n * 100))
}

function clampRating(value) {
  const raw = String(value ?? '')
    .replace(/[^\d.]/g, '')
    .replace(/^(\d+\.\d*).*$/, '$1')
    .slice(0, 4)
  if (!raw) return ''
  const num = Number(raw)
  if (Number.isNaN(num)) return ''
  return String(Math.min(10, num))
}

export default function HotelList() {
  const router = Taro.getCurrentInstance().router
  const params = router?.params || {}

  const keywordFromRoute = decodeParam(params.keyword)
  const cityFromRoute = decodeParam(params.city)
  const routeDates = normalizeStayDates(params.checkIn || params.check_in, params.checkOut || params.check_out)
  const routeCheckIn = routeDates.checkIn
  const routeCheckOut = routeDates.checkOut
  const routeRooms = Number(params.rooms_count || 1)
  const routeAdults = Number(params.adults || 2)
  const routeMinStar = Number(params.min_star)
  const routeMaxStar = Number(params.max_star)
  const routeBreakfast = params.breakfast === 'true' || params.breakfast === true
  const routeRefundable = params.refundable === 'true' || params.refundable === true
  const routeSelectedStars =
    Number.isFinite(routeMinStar) && Number.isFinite(routeMaxStar) && routeMinStar >= 1 && routeMaxStar >= routeMinStar
      ? Array.from({ length: routeMaxStar - routeMinStar + 1 }, (_, i) => routeMinStar + i)
      : []

  const [hotelList, setHotelList] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [city, setCity] = useState(cityFromRoute || '上海')
  const [searchKeyword, setSearchKeyword] = useState(keywordFromRoute)
  const [sort, setSort] = useState('recommended')
  const [sheet, setSheet] = useState(null)

  const [selectedStars, setSelectedStars] = useState(routeSelectedStars)
  const [minPrice, setMinPrice] = useState(centsToYuanText(params.min_price))
  const [maxPrice, setMaxPrice] = useState(centsToYuanText(params.max_price))
  const [minRating, setMinRating] = useState('')
  const [breakfast, setBreakfast] = useState(routeBreakfast)
  const [refundable, setRefundable] = useState(routeRefundable)
  const [nearbyType, setNearbyType] = useState('')
  const [nearbyKeyword, setNearbyKeyword] = useState('')
  const [nearbySort, setNearbySort] = useState('none')

  const [showCityPicker, setShowCityPicker] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentYear, setCurrentYear] = useState(dayjs().year())
  const [currentMonth, setCurrentMonth] = useState(dayjs().month())
  const [checkIn, setCheckIn] = useState(routeCheckIn)
  const [checkOut, setCheckOut] = useState(routeCheckOut)
  const [roomsCount, setRoomsCount] = useState(Number.isFinite(routeRooms) && routeRooms > 0 ? routeRooms : 1)
  const [adultCount, setAdultCount] = useState(Number.isFinite(routeAdults) && routeAdults > 0 ? routeAdults : 2)
  const [tempCheckIn, setTempCheckIn] = useState(null)
  const [tempCheckOut, setTempCheckOut] = useState(null)

  const [searchFocused, setSearchFocused] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [showGuestSheet, setShowGuestSheet] = useState(false)
  const filterAutoSearchReadyRef = useRef(false)
  const [filterMeta, setFilterMeta] = useState(null)
  const [filterMetaLoading, setFilterMetaLoading] = useState(false)

  // const daysInMonth = dayjs(`${currentYear}-${currentMonth + 1}-01`).daysInMonth()
  // const dateList = Array.from({ length: daysInMonth }).map((_, i) =>
  //   dayjs(`${currentYear}-${currentMonth + 1}-${i + 1}`).format('YYYY-MM-DD')
  // )
  const generateDateList = (year, month) => {
    const firstDayOfMonth = dayjs().year(year).month(month).date(1);
    const daysInMonth = firstDayOfMonth.daysInMonth();
    const firstDayWeekday = firstDayOfMonth.day(); 
    const cells = [];
    for (let i = 0; i < firstDayWeekday; i++) {
      cells.push(""); 
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const fullDate = firstDayOfMonth.date(i).format('YYYY-MM-DD');
      cells.push(fullDate);
    }
    while (cells.length < 42) {
      cells.push("");
    }
    return cells;
  };
  const dateList = generateDateList(currentYear, currentMonth);

  const weekMap = ['日', '一', '二', '三', '四', '五', '六']
  const todayDate = dayjs().startOf('day')
  const nights = Math.max(dayjs(checkOut).diff(dayjs(checkIn), 'day'), 1)
  const guestSummary = `${roomsCount}间房 · ${adultCount}位住客`

  const currentSortLabel = sortOptions.find(item => item.value === sort)?.label || '综合推荐'
  const fallbackNearbyExamples = nearbyExamplesByCity[city] || ['地铁站', '商圈', '景点']
  const nearbyMetroOptions = filterMeta?.nearby_points?.metro || []
  const nearbyAttractionOptions = filterMeta?.nearby_points?.attraction || []
  const nearbyExamples =
    nearbyType === 'metro'
      ? (nearbyMetroOptions.map(x => x.name).slice(0, 12) || [])
      : nearbyType === 'attraction'
        ? (nearbyAttractionOptions.map(x => x.name).slice(0, 12) || [])
        : fallbackNearbyExamples
  const metroNameSet = new Set(nearbyMetroOptions.map(x => x.name))
  const attractionNameSet = new Set(nearbyAttractionOptions.map(x => x.name))

  const starOptions = [
    { label: '经济', value: 2 },
    { label: '三星', value: 3 },
    { label: '四星', value: 4 },
    { label: '五星', value: 5 }
  ]

  useEffect(() => {
    const today = dayjs().startOf('day')
    const inDay = dayjs(checkIn)
    const outDay = dayjs(checkOut)
    if (!inDay.isValid() || inDay.isBefore(today, 'day')) {
      setCheckIn(today.format('YYYY-MM-DD'))
      setCheckOut(today.add(1, 'day').format('YYYY-MM-DD'))
      return
    }
    if (!outDay.isValid() || !outDay.isAfter(inDay, 'day')) {
      setCheckOut(inDay.add(1, 'day').format('YYYY-MM-DD'))
    }
  }, [checkIn, checkOut])

  const appliedConditions = useMemo(() => {
    const chips = []
    if (breakfast) chips.push('含早餐')
    if (refundable) chips.push('可退款')
    if (selectedStars.length) chips.push(`${Math.min(...selectedStars)}-${Math.max(...selectedStars)}星`)
    if (minRating) chips.push(`${minRating}+分`)
    if (minPrice || maxPrice) chips.push(`¥${minPrice || 0}-${maxPrice || '不限'}`)
    if (nearbyType === 'metro') chips.push('附近地铁')
    if (nearbyType === 'attraction') chips.push('附近景点')
    if (nearbyKeyword) chips.push(`附近: ${nearbyKeyword}`)
    if (nearbySort === 'distance_asc') chips.push('由近到远')
    if (nearbySort === 'distance_desc') chips.push('由远到近')
    return chips
  }, [breakfast, refundable, selectedStars, minRating, minPrice, maxPrice, nearbyType, nearbyKeyword, nearbySort])

  const filterAutoSearchKey = useMemo(
    () =>
      JSON.stringify({
        city,
        checkIn,
        checkOut,
        roomsCount,
        adultCount,
        stars: [...selectedStars].sort((a, b) => a - b),
        minPrice,
        maxPrice,
        minRating,
        breakfast,
        refundable,
        nearbyType,
        nearbyKeyword,
        nearbySort,
      }),
    [
      city,
      checkIn,
      checkOut,
      roomsCount,
      adultCount,
      selectedStars,
      minPrice,
      maxPrice,
      minRating,
      breakfast,
      refundable,
      nearbyType,
      nearbyKeyword,
      nearbySort,
    ],
  )

  const formatDate = (date) => {
    const d = dayjs(date)
    return `${d.format('MM月DD日')} 周${weekMap[d.day()]}`
  }

  const buildQuery = (pageValue = page) => {
    const query = {
      city,
      page: pageValue,
      limit: 20,
      sort
    }

    if (searchKeyword) query.keyword = searchKeyword
    if (checkIn) query.check_in = checkIn
    if (checkOut) query.check_out = checkOut
    if (roomsCount) query.rooms_count = roomsCount
    if (adultCount) query.adults = adultCount
    if (minPrice) query.min_price = yuanToCentsText(minPrice)
    if (maxPrice) query.max_price = yuanToCentsText(maxPrice)
    if (selectedStars.length) {
      query.min_star = Math.min(...selectedStars)
      query.max_star = Math.max(...selectedStars)
    }
    if (minRating) query.min_rating = minRating
    if (breakfast) query.breakfast = true
    if (refundable) query.refundable = true
    if (nearbyType) query.nearby_type = nearbyType
    if (nearbyKeyword) query.nearby_keyword = nearbyKeyword
    if (nearbySort !== 'none') query.nearby_sort = nearbySort
    return query
  }

  const fetchHotels = async (reset = false, pageOverride) => {
    if (loading) return
    setLoading(true)

    try {
      const requestPage = pageOverride ?? page
      const data = await api.getHotels(buildQuery(requestPage))
      const items = data?.items || []
      setTotal(data?.total || 0)
      if (reset) {
        setHotelList(items)
      } else {
        setHotelList(prev => [...prev, ...items])
      }
    } catch (error) {
      console.error('fetchHotels failed:', error)
      Taro.showToast({ title: '酒店列表加载失败', icon: 'none' })
      if (reset) {
        setHotelList([])
        setTotal(0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHotels(true, 1)
    setPage(1)
  }, [sort])

  useEffect(() => {
    if (!filterAutoSearchReadyRef.current) {
      filterAutoSearchReadyRef.current = true
      return
    }

    const timer = setTimeout(() => {
      setPage(1)
      fetchHotels(true, 1)
    }, 280)

    return () => clearTimeout(timer)
  }, [filterAutoSearchKey])

  useEffect(() => {
    setSearchKeyword('')
    setSuggestions([])
    setSearchFocused(false)
  }, [city])

  useEffect(() => {
    if (page > 1) fetchHotels(false, page)
  }, [page])

  useEffect(() => {
    const kw = searchKeyword.trim()
    if (!searchFocused || !kw) {
      setSuggestions([])
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        const data = await api.getSuggestions(kw, city || undefined)
        if (!cancelled) setSuggestions(data?.items || [])
      } catch {
        if (!cancelled) setSuggestions([])
      } finally {
        if (!cancelled) setSuggestionsLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchKeyword, city, searchFocused])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setFilterMetaLoading(true)
      try {
        const data = await api.getFilterMetadata(city || undefined)
        if (!cancelled) setFilterMeta(data || null)
      } catch {
        if (!cancelled) setFilterMeta(null)
      } finally {
        if (!cancelled) setFilterMetaLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [city])

  useReachBottom(() => {
    if (loading || hotelList.length >= total) return
    setPage(p => p + 1)
  })

  const toggleStar = (val) => {
    if (selectedStars.includes(val)) {
      setSelectedStars(selectedStars.filter(s => s !== val))
    } else {
      setSelectedStars([...selectedStars, val])
    }
  }

  const handleNearbyTypeChange = (nextType) => {
    setNearbyType(nextType)
    if (!nearbyKeyword) return
    if (nextType === 'metro' && !metroNameSet.has(nearbyKeyword)) {
      setNearbyKeyword('')
      return
    }
    if (nextType === 'attraction' && !attractionNameSet.has(nearbyKeyword)) {
      setNearbyKeyword('')
      return
    }
  }

  const applyFilters = () => {
    setSheet(null)
  }

  const clearFilters = () => {
    setSelectedStars([])
    setMinPrice('')
    setMaxPrice('')
    setMinRating('')
    setBreakfast(false)
    setRefundable(false)
    setNearbyType('')
    setNearbyKeyword('')
    setNearbySort('none')
    setSheet(null)
  }

  const executeSearch = () => {
    setSearchFocused(false)
    setSuggestions([])
    setPage(1)
    fetchHotels(true, 1)
  }

  const openCalendar = () => {
    setTempCheckIn(checkIn)
    setTempCheckOut(checkOut)
    setShowCalendar(true)
  }

  const confirmDate = () => {
    if (!tempCheckIn || !tempCheckOut) {
      Taro.showToast({ title: '请选择完整日期', icon: 'none' })
      return
    }
    setCheckIn(tempCheckIn)
    setCheckOut(tempCheckOut)
    setShowCalendar(false)
  }

  return (
    <View className='hotel-page'>
      <View className='list-hero'>
        <View className='list-hero-bg' />
        <View className='query-card'>
          <View className='query-head'>
            <View className='query-city-wrap' onClick={() => setShowCityPicker(true)}>
              <Text className='query-city'>{city || '选择城市'}</Text>
              <Text className='query-city-arrow'>▼</Text>
            </View>
            <View className='query-date-badge' onClick={openCalendar}>
              {dayjs(checkIn).format('MM/DD')} - {dayjs(checkOut).format('MM/DD')} · {nights}晚
            </View>
          </View>

          <View className='search-box'>
            <Input
              className='search-input'
              value={searchKeyword}
              placeholder='搜索景点、商圈、酒店名'
              maxlength={24}
              onInput={e => setSearchKeyword(clampText(e.detail.value, 24))}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onConfirm={executeSearch}
            />
            <View className='search-btn-mini' onClick={executeSearch}>搜索</View>
          </View>

          {searchFocused && (
            <View className='suggest-panel'>
              {suggestionsLoading && <View className='suggest-item muted'>正在获取搜索建议...</View>}
              {!suggestionsLoading && suggestions.map(item => (
                <View
                  key={item.id}
                  className='suggest-item'
                  onClick={() => {
                    const nextKeyword = String(item.label || '').split(' · ')[0] || ''
                    const cityChanged = !!item.city && item.city !== city
                    if (cityChanged) {
                      setSearchKeyword('')
                    }
                    setSearchKeyword(nextKeyword)
                    if (item.city) setCity(item.city)
                    setSearchFocused(false)
                    setSuggestions([])
                    setPage(1)
                    fetchHotels(true, 1)
                  }}
                >
                  <View>
                    <Text className='suggest-title'>{item.label}</Text>
                    <Text className='suggest-sub'>{item.city || city}</Text>
                  </View>
                  {item.rating ? <Text className='suggest-rating'>{Number(item.rating).toFixed(1)}分</Text> : null}
                </View>
              ))}
              {!suggestionsLoading && !suggestions.length && (
                <View className='suggest-item muted'>输入关键词后显示建议</View>
              )}
            </View>
          )}

          <View className='meta-line'>
            <Text>{formatDate(checkIn)} - {formatDate(checkOut)}</Text>
            <Text>共找到 {total} 家酒店</Text>
          </View>
          <View className='meta-line meta-line-compact'>
            <Text onClick={() => setShowGuestSheet(true)}>{guestSummary}</Text>
            <Text onClick={() => setShowGuestSheet(true)} className='meta-link'>修改入住信息</Text>
          </View>
        </View>
      </View>

      <ScrollView scrollX className='filter-bar'>
        <View className='filter-pill sort-pill' onClick={() => setSheet(sheet === 'sort' ? null : 'sort')}>
          <Text>{currentSortLabel}</Text>
          <Text className='arrow'>▼</Text>
        </View>
        <View className='filter-pill' onClick={() => setSheet('filter')}>筛选</View>
        <View className='filter-pill' onClick={() => setSheet('nearby')}>附近</View>
        <View className='filter-pill' onClick={() => setSheet('price')}>价格</View>
        <View className='filter-pill' onClick={() => setSheet('location')}>城市</View>
        <View className='filter-pill' onClick={() => setShowGuestSheet(true)}>房间/人数</View>
        {!!appliedConditions.length && (
          <View className='filter-pill filter-pill-clear' onClick={clearFilters}>清空筛选</View>
        )}
      </ScrollView>

      <ScrollView scrollX className='tag-bar'>
        {appliedConditions.length ? (
          appliedConditions.map(tag => (
            <View key={tag} className='tag-chip'>{tag}</View>
          ))
        ) : (
          <View className='tag-chip tag-chip-muted'>当前仅按基础条件查询</View>
        )}
      </ScrollView>

      <ScrollView scrollY className='list'>
        {hotelList.map(item => {
          const displayName = item.name_cn || item.name || '未命名酒店'
          const displayRating = item.review_summary?.rating ?? item.rating ?? 0
          const displayPrice = item.min_nightly_price ?? item.min_total_price ?? item.rooms?.[0]?.base_price ?? 0
          const cover = item.hotel_images?.[0]?.url

          return (
            <View
              key={item.id}
              className='hotel-card'
              onClick={() =>
                Taro.navigateTo({
                  url: `/pages/hotelDetail/index?id=${item.id}&check_in=${encodeURIComponent(checkIn || '')}&check_out=${encodeURIComponent(checkOut || '')}&rooms_count=${roomsCount}&adults=${adultCount}`,
                })
              }
            >
              <View
                className={`hotel-img ${cover ? 'hotel-img-cover' : ''}`}
                style={cover ? { backgroundImage: `url(${cover})` } : {}}
              />
              <View className='hotel-info'>
                <View className='hotel-title-row'>
                  <Text className='hotel-name'>{displayName}</Text>
                  {!!item.star && <Text className='hotel-star'>{item.star}星</Text>}
                </View>

                <View className='hotel-meta-row'>
                  <Text className='hotel-city'>{item.city || city}</Text>
                  <Text className='hotel-rating'>{Number(displayRating).toFixed(1)}分</Text>
                </View>

                {item.nearest_nearby_point && (
                  <View className='hotel-nearby'>
                    <Text className='hotel-nearby-type'>
                      {item.nearest_nearby_point.type === 'metro' ? '地铁' : '景点'}
                    </Text>
                    <Text className='hotel-nearby-text'>
                      {item.nearest_nearby_point.name} · {Number(item.nearest_nearby_distance_km ?? item.nearest_nearby_point.distance_km ?? 0).toFixed(1)}km
                    </Text>
                  </View>
                )}

                <View className='hotel-bottom'>
                  <Text className='price-symbol'>¥</Text>
                  <Text className='hotel-price'>{Math.round(Number(displayPrice) / 100)}</Text>
                  <Text className='price-unit'>/晚起</Text>
                </View>
              </View>
            </View>
          )
        })}

        {!loading && hotelList.length === 0 && (
          <View className='empty-box'>
            <Text className='empty-title'>没有找到符合条件的酒店</Text>
            <Text className='empty-sub'>可尝试放宽价格、评分或附近筛选条件</Text>
          </View>
        )}

        {loading && <View className='loading'>加载中...</View>}
        {!loading && hotelList.length > 0 && hotelList.length >= total && (
          <View className='loading loading-muted'>已经到底了</View>
        )}
      </ScrollView>

      {sheet === 'sort' && (
        <View className='mask' onClick={() => setSheet(null)}>
          <View className='sheet' onClick={e => e.stopPropagation()}>
            <View className='sheet-head'>
              <Text>排序方式</Text>
              <Text className='sheet-head-action' onClick={() => setSheet(null)}>关闭</Text>
            </View>
            <View className='sheet-body'>
              {sortOptions.map(item => (
                <View
                  key={item.value}
                  className={`sort-option ${sort === item.value ? 'sort-option-active' : ''}`}
                  onClick={() => {
                    if (sort === item.value) {
                      setSheet(null)
                      return
                    }
                    setSort(item.value)
                    setSheet(null)
                  }}
                >
                  <Text>{item.label}</Text>
                  {sort === item.value ? <Text className='check-mark'>✓</Text> : null}
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {sheet === 'filter' && (
        <View className='mask' onClick={() => setSheet(null)}>
          <View className='sheet' onClick={e => e.stopPropagation()}>
            <View className='sheet-head'>
              <Text>筛选条件</Text>
              <Text className='sheet-head-action' onClick={clearFilters}>重置</Text>
            </View>
            <View className='sheet-body form-block'>
              <Text className='drawer-title'>星级</Text>
              <View className='mini-stars'>
                {starOptions.map(s => (
                  <View
                    key={s.value}
                    className={`mini-star ${selectedStars.includes(s.value) ? 'mini-star-active' : ''}`}
                    onClick={() => toggleStar(s.value)}
                  >
                    {s.label}
                  </View>
                ))}
              </View>

              <Text className='drawer-title'>最低评分</Text>
              <Input
                className='inp'
                type='number'
                placeholder='例如 8 或 9'
                value={minRating}
                maxlength={4}
                onInput={e => setMinRating(clampRating(e.detail.value))}
              />

              <Text className='drawer-title'>房型条件</Text>
              <View className='mini-stars'>
                <View
                  className={`mini-star ${breakfast ? 'mini-star-active' : ''}`}
                  onClick={() => setBreakfast(v => !v)}
                >
                  含早餐
                </View>
                <View
                  className={`mini-star ${refundable ? 'mini-star-active' : ''}`}
                  onClick={() => setRefundable(v => !v)}
                >
                  可退款
                </View>
              </View>

              <Button className='confirm-btn' onClick={applyFilters}>完成</Button>
            </View>
          </View>
        </View>
      )}

      {sheet === 'location' && (
        <View className='mask' onClick={() => setSheet(null)}>
          <View className='sheet' onClick={e => e.stopPropagation()}>
            <View className='sheet-head'>
              <Text>选择城市</Text>
              <Text className='sheet-head-action' onClick={() => setSheet(null)}>关闭</Text>
            </View>
            <View className='sheet-body form-block'>
              <Input
                className='inp'
                placeholder='输入城市名称'
                value={city}
                maxlength={12}
                onInput={e => setCity(clampText(e.detail.value, 12))}
              />
              <View className='mini-stars'>
                {CITY_OPTIONS.map(item => (
                  <View
                    key={item}
                    className={`mini-star ${city === item ? 'mini-star-active' : ''}`}
                    onClick={() => setCity(item)}
                  >
                    {item}
                  </View>
                ))}
              </View>
              <Button className='confirm-btn' onClick={applyFilters}>完成</Button>
            </View>
          </View>
        </View>
      )}

      {sheet === 'price' && (
        <View className='mask' onClick={() => setSheet(null)}>
          <View className='sheet' onClick={e => e.stopPropagation()}>
            <View className='sheet-head'>
              <Text>价格（每晚，元）</Text>
              <Text className='sheet-head-action' onClick={() => setSheet(null)}>关闭</Text>
            </View>
            <View className='sheet-body form-block'>
              <Input
                className='inp'
                type='number'
                placeholder='最低价（元）'
                value={minPrice}
                maxlength={7}
                onInput={e => setMinPrice(clampDigits(e.detail.value, 7))}
              />
              <Input
                className='inp'
                type='number'
                placeholder='最高价（元）'
                value={maxPrice}
                maxlength={7}
                onInput={e => setMaxPrice(clampDigits(e.detail.value, 7))}
              />
              <View className='mini-stars'>
                {[
                  { label: '¥200以内', min: '', max: '200' },
                  { label: '¥200-500', min: '200', max: '500' },
                  { label: '¥500-800', min: '500', max: '800' },
                  { label: '¥800+', min: '800', max: '' }
                ].map(item => (
                  <View
                    key={item.label}
                    className={`mini-star ${minPrice === item.min && maxPrice === item.max ? 'mini-star-active' : ''}`}
                    onClick={() => {
                      setMinPrice(item.min)
                      setMaxPrice(item.max)
                    }}
                  >
                    {item.label}
                  </View>
                ))}
              </View>
              <Button className='confirm-btn' onClick={applyFilters}>完成</Button>
            </View>
          </View>
        </View>
      )}

      {sheet === 'nearby' && (
        <View className='mask' onClick={() => setSheet(null)}>
          <View className='sheet' onClick={e => e.stopPropagation()}>
            <View className='sheet-head'>
              <Text>附近条件</Text>
              <Text className='sheet-head-action' onClick={() => setSheet(null)}>关闭</Text>
            </View>
            <View className='sheet-body form-block'>
              <Text className='drawer-title'>附近类型</Text>
              <View className='mini-stars'>
                {[
                  { label: '不限', value: '' },
                  { label: '地铁/车站', value: 'metro' },
                  { label: '景点', value: 'attraction' }
                ].map(item => (
                  <View
                    key={item.value || 'all'}
                    className={`mini-star ${nearbyType === item.value ? 'mini-star-active' : ''}`}
                    onClick={() => handleNearbyTypeChange(item.value)}
                  >
                    {item.label}
                  </View>
                ))}
              </View>

              <Text className='drawer-title'>附近关键词</Text>
              <Input
                className='inp'
                placeholder='例如：人民广场 / 陆家嘴'
                value={nearbyKeyword}
                maxlength={18}
                onInput={e => setNearbyKeyword(clampText(e.detail.value, 18))}
              />
              {filterMetaLoading && (
                <View className='nearby-hint'>正在加载当前城市可用地点...</View>
              )}
              {!filterMetaLoading && (nearbyMetroOptions.length || nearbyAttractionOptions.length) ? (
                <View className='nearby-groups'>
                  {!!nearbyMetroOptions.length && (
                    <View className='nearby-group'>
                      <Text className='nearby-group-title'>地铁 / 车站（当前城市可选）</Text>
                      <View className='mini-stars'>
                        {nearbyMetroOptions.slice(0, 12).map(item => (
                          <View
                            key={`metro-${item.name}`}
                            className={`mini-star ${nearbyType === 'metro' && nearbyKeyword === item.name ? 'mini-star-active' : ''}`}
                            onClick={() => {
                              setNearbyType('metro')
                              setNearbyKeyword(item.name)
                            }}
                          >
                            {item.name}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {!!nearbyAttractionOptions.length && (
                    <View className='nearby-group'>
                      <Text className='nearby-group-title'>景点 / 商圈（当前城市可选）</Text>
                      <View className='mini-stars'>
                        {nearbyAttractionOptions.slice(0, 12).map(item => (
                          <View
                            key={`attraction-${item.name}`}
                            className={`mini-star ${nearbyType === 'attraction' && nearbyKeyword === item.name ? 'mini-star-active' : ''}`}
                            onClick={() => {
                              setNearbyType('attraction')
                              setNearbyKeyword(item.name)
                            }}
                          >
                            {item.name}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ) : null}
              {!filterMetaLoading && !nearbyMetroOptions.length && !nearbyAttractionOptions.length && (
                <View>
                  <Text className='nearby-group-title'>快捷示例</Text>
                  <View className='mini-stars'>
                    {nearbyExamples.map(item => (
                      <View
                        key={item}
                        className={`mini-star ${nearbyKeyword === item ? 'mini-star-active' : ''}`}
                        onClick={() => setNearbyKeyword(item)}
                      >
                        {item}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Text className='drawer-title'>附近排序</Text>
              <View className='mini-stars'>
                {[
                  { label: '默认', value: 'none' },
                  { label: '由近到远', value: 'distance_asc' },
                  { label: '由远到近', value: 'distance_desc' }
                ].map(item => (
                  <View
                    key={item.value}
                    className={`mini-star ${nearbySort === item.value ? 'mini-star-active' : ''}`}
                    onClick={() => setNearbySort(item.value)}
                  >
                    {item.label}
                  </View>
                ))}
              </View>

              <Button className='confirm-btn' onClick={applyFilters}>完成</Button>
            </View>
          </View>
        </View>
      )}

      {showCityPicker && (
        <View className='mask' onClick={() => setShowCityPicker(false)}>
          <View className='popup city-popup' onClick={e => e.stopPropagation()}>
            <View className='popup-header'>
              <Text className='popup-title'>切换城市</Text>
              <Text className='popup-close' onClick={() => setShowCityPicker(false)}>关闭</Text>
            </View>
            <ScrollView scrollY className='popup-body'>
              <View className='city-grid'>
                {CITY_OPTIONS.map(item => (
                  <View
                    key={item}
                    className={`city-tag ${city === item ? 'active-city' : ''}`}
                    onClick={() => {
                      setCity(item)
                      setShowCityPicker(false)
                    }}
                  >
                    {item}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {showCalendar && (
        <View className='mask' onClick={() => setShowCalendar(false)}>
          <View className='popup' onClick={e => e.stopPropagation()}>
            <Text className='popup-title calendar-title'>选择日期</Text>
            <View className='calendar-header'>
              <View
                className='calendar-arrow'
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentYear(currentYear - 1)
                    setCurrentMonth(11)
                  } else {
                    setCurrentMonth(currentMonth - 1)
                  }
                }}
              >
                ◀
              </View>
              <Text>{currentYear}年 {currentMonth + 1}月</Text>
              <View
                className='calendar-arrow'
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentYear(currentYear + 1)
                    setCurrentMonth(0)
                  } else {
                    setCurrentMonth(currentMonth + 1)
                  }
                }}
              >
                ▶
              </View>
            </View>

            <View className='calendar-grid'>
              {['日', '一', '二', '三', '四', '五', '六'].map(week => (
                <View key={week} className='calendar-weekday'>
                  {week}
                </View>
              ))}
            </View>
            <View className='calendar-grid'>
              {dateList.map((date, idx) => {
                if (!date) return <View key={`blank-${idx}`} className='sheet-day blank' />;
                const onlyCheckInSelected = tempCheckIn && !tempCheckOut
                const isPast = dayjs(date).isBefore(todayDate, 'day')
                const isDisabled = isPast || (onlyCheckInSelected && dayjs(date).isBefore(dayjs(tempCheckIn), 'day'))
                const isSelected = date === tempCheckIn || date === tempCheckOut
                const isInRange =
                  tempCheckIn &&
                  tempCheckOut &&
                  dayjs(date).isAfter(dayjs(tempCheckIn), 'day') &&
                  dayjs(date).isBefore(dayjs(tempCheckOut), 'day')

                return (
                  <View
                    key={date}
                    className={`calendar-day ${isSelected ? 'active' : ''} ${isInRange ? 'in-range' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => {
                      if (isDisabled) return
                      if (!tempCheckIn || (tempCheckIn && tempCheckOut)) {
                        setTempCheckIn(date)
                        setTempCheckOut('')
                        return
                      }
                      if (dayjs(date).isAfter(dayjs(tempCheckIn), 'day')) {
                        setTempCheckOut(date)
                      } else {
                        setTempCheckIn(date)
                        setTempCheckOut('')
                      }
                    }}
                  >
                    {dayjs(date).date()}
                  </View>
                )
              })}
            </View>

            <Button className='calendar-btn' onClick={confirmDate}>确认日期</Button>
          </View>
        </View>
      )}

      {showGuestSheet && (
        <View className='mask' onClick={() => setShowGuestSheet(false)}>
          <View className='popup' onClick={e => e.stopPropagation()}>
            <View className='popup-header'>
              <Text className='popup-title'>房间与住客</Text>
              <Text className='popup-close' onClick={() => setShowGuestSheet(false)}>关闭</Text>
            </View>

            <View className='counter-row'>
              <Text className='counter-label'>房间数</Text>
              <View className='counter-actions'>
                <View className='counter-btn' onClick={() => setRoomsCount(v => Math.max(1, v - 1))}>-</View>
                <Text className='counter-value'>{roomsCount}</Text>
                <View className='counter-btn' onClick={() => setRoomsCount(v => Math.min(6, v + 1))}>+</View>
              </View>
            </View>

            <View className='counter-row'>
              <Text className='counter-label'>住客</Text>
              <View className='counter-actions'>
                <View className='counter-btn' onClick={() => setAdultCount(v => Math.max(1, v - 1))}>-</View>
                <Text className='counter-value'>{adultCount}</Text>
                <View className='counter-btn' onClick={() => setAdultCount(v => Math.min(8, v + 1))}>+</View>
              </View>
            </View>

            <Button
              className='calendar-btn'
              onClick={() => {
                setShowGuestSheet(false)
              }}
            >
              应用
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}

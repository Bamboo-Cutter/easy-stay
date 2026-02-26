import {
  View,
  Text,
  Image,
  Input,
  Button,
  ScrollView,
  Swiper,
  SwiperItem
} from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { api } from '../../utils/api'
import './index.css'

const DOMESTIC_HOT_CITIES = ['上海', '北京', '广州', '深圳', '杭州', '成都']
const DOMESTIC_ALL_CITIES = [
  '上海', '北京', '广州', '深圳', '杭州', '成都',
  '重庆', '天津', '南京', '苏州', '武汉', '西安',
  '长沙', '郑州', '青岛', '厦门', '福州', '济南',
  '合肥', '宁波', '无锡', '东莞', '佛山', '珠海',
  '昆明', '贵阳', '南宁', '海口', '三亚', '南昌',
  '太原', '石家庄', '沈阳', '大连', '长春', '哈尔滨',
  '呼和浩特', '兰州', '西宁', '银川', '乌鲁木齐', '拉萨'
]
const OVERSEAS_CITIES = ['东京', '新加坡']
const CITY_OPTIONS = Array.from(new Set([...DOMESTIC_ALL_CITIES, ...OVERSEAS_CITIES]))
const DEMO_OPEN_CITIES = new Set(['上海', '北京', '广州', '深圳', '杭州', '成都', '东京', '新加坡'])
const DOMESTIC_ALL_OTHER_CITIES = DOMESTIC_ALL_CITIES.filter((city) => !DOMESTIC_HOT_CITIES.includes(city))
const DOMESTIC_CITY_INITIALS = {
  重庆: 'C', 天津: 'T', 南京: 'N', 苏州: 'S', 武汉: 'W', 西安: 'X',
  长沙: 'C', 郑州: 'Z', 青岛: 'Q', 厦门: 'X', 福州: 'F', 济南: 'J',
  合肥: 'H', 宁波: 'N', 无锡: 'W', 东莞: 'D', 佛山: 'F', 珠海: 'Z',
  昆明: 'K', 贵阳: 'G', 南宁: 'N', 海口: 'H', 三亚: 'S', 南昌: 'N',
  太原: 'T', 石家庄: 'S', 沈阳: 'S', 大连: 'D', 长春: 'C', 哈尔滨: 'H',
  呼和浩特: 'H', 兰州: 'L', 西宁: 'X', 银川: 'Y', 乌鲁木齐: 'W', 拉萨: 'L',
}
const DOMESTIC_LETTER_GROUPS = Object.entries(
  DOMESTIC_ALL_OTHER_CITIES.reduce((acc, city) => {
    const letter = DOMESTIC_CITY_INITIALS[city] || '#'
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(city)
    return acc
  }, {})
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([letter, cities]) => ({ letter, cities }))
const STAR_OPTIONS = ['不限', '经济', '三星', '四星', '五星']
const QQ_MAP_KEY = 'BHWBZ-5226A-JOHKN-CJ364-AUDUQ-NUBCZ'

const QUICK_PRESETS = [
  { label: '陆家嘴夜景', city: '上海', keyword: '陆家嘴' },
  { label: '王府井商圈', city: '北京', keyword: '王府井' },
  { label: '西湖度假', city: '杭州', keyword: '西湖' },
  { label: '春熙路', city: '成都', keyword: '春熙路' }
]

const ATTRIBUTE_QUICK_TAGS = [
  { key: 'family', label: '亲子友好', breakfast: true, refundable: true },
  { key: 'luxury', label: '豪华五星', minStar: 5, maxStar: 5 },
  { key: 'budget', label: '经济实惠', maxPriceYuan: 400 },
  { key: 'free_cancel', label: '可免费取消', refundable: true },
  { key: 'breakfast', label: '含早餐', breakfast: true },
]

const DESTINATION_EXAMPLES = {
  上海: ['外滩', '陆家嘴', '南京路'],
  北京: ['国贸', '王府井', '三里屯'],
  广州: ['珠江新城', '广州塔', '北京路'],
  深圳: ['福田', '车公庙', '深圳湾'],
  杭州: ['西湖', '龙翔桥', '灵隐寺'],
  成都: ['春熙路', '太古里', '武侯祠'],
  东京: ['银座', '新宿', '涩谷'],
  新加坡: ['滨海湾', '乌节路', '克拉码头'],
}

const CITY_PICKER_SECTIONS = [
  { key: 'hot', title: '国内热门', cities: DOMESTIC_HOT_CITIES },
  { key: 'domestic', title: '全国城市', cities: DOMESTIC_ALL_OTHER_CITIES },
  { key: 'overseas', title: '海外', cities: OVERSEAS_CITIES },
]

const clampText = (value, max = 24) =>
  String(value ?? '')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .slice(0, max)

const clampDigits = (value, max = 7) =>
  (function () {
    const raw = String(value ?? '')
      .replace(/\D/g, '')
      .replace(/^0+(?=\d)/, '')
      .slice(0, max)
    return raw === '' ? '' : String(Number(raw))
  })()

const toCentString = (yuanText) => {
  const n = Number(String(yuanText || '').trim())
  if (!Number.isFinite(n) || n <= 0) return ''
  return String(Math.round(n * 100))
}

const toYuanText = (centValue) => {
  const n = Number(centValue)
  if (!Number.isFinite(n) || n <= 0) return '--'
  return String(Math.round(n / 100))
}

const normalizeCityName = (raw) => {
  const text = String(raw || '').trim()
  if (!text) return ''
  const directHit = CITY_OPTIONS.find((item) => text === item || text.startsWith(item))
  if (directHit) return directHit
  const stripped = text.replace(/(特别行政区|自治州|地区|盟|市|区|县)$/u, '')
  return CITY_OPTIONS.find((item) => stripped === item || stripped.startsWith(item)) || stripped || text
}

export default function Home() {
  const [city, setCity] = useState('定位中...')
  const [keyword, setKeyword] = useState('')
  const [checkIn, setCheckIn] = useState(dayjs().format('YYYY-MM-DD'))
  const [checkOut, setCheckOut] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'))
  const [tempCheckIn, setTempCheckIn] = useState(null)
  const [tempCheckOut, setTempCheckOut] = useState(null)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentYear, setCurrentYear] = useState(dayjs().year())
  const [currentMonth, setCurrentMonth] = useState(dayjs().month())
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [showStarSelect, setShowStarSelect] = useState(false)
  const [showGuestSheet, setShowGuestSheet] = useState(false)
  const [domesticLetter, setDomesticLetter] = useState(DOMESTIC_LETTER_GROUPS[0]?.letter || '')
  const [stars, setStars] = useState([])
  const [roomsCount, setRoomsCount] = useState(1)
  const [adultCount, setAdultCount] = useState(2)
  const [featuredHotels, setFeaturedHotels] = useState([])
  const [featuredLoading, setFeaturedLoading] = useState(false)
  const [banners, setBanners] = useState([])
  const [activeQuickAttrKey, setActiveQuickAttrKey] = useState('')

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

  useEffect(() => {
    try {
      handleLocate()
    } catch (err) {
      setCity('上海')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    api.getBanners()
      .then((list) => {
        if (!cancelled) setBanners(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) setBanners([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const nextCity = normalizeCityName(city)
    if (!nextCity || nextCity === '定位中...') return
    let cancelled = false
    setFeaturedLoading(true)
    api.getFeatured(nextCity)
      .then((list) => {
        if (!cancelled) setFeaturedHotels(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) setFeaturedHotels([])
      })
      .finally(() => {
        if (!cancelled) setFeaturedLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [city])

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

  const nights = Math.max(dayjs(checkOut).diff(dayjs(checkIn), 'day'), 1)
  const todayDate = dayjs().startOf('day')
  const weekMap = ['日', '一', '二', '三', '四', '五', '六']
  const formatDate = (date) => {
    const d = dayjs(date)
    return `${d.format('MM月DD日')} 周${weekMap[d.day()]}`
  }

  const getStarRange = (selected) => {
    const starMap = {
      经济: 2,
      三星: 3,
      四星: 4,
      五星: 5
    }

    if (!selected || selected.length === 0) return [null, null]

    const values = selected
      .filter(star => starMap[star] !== undefined)
      .map(star => starMap[star])

    if (!values.length) return [null, null]
    return [Math.min(...values), Math.max(...values)]
  }

  const handleSearch = () => {
    const [minStar, maxStar] = getStarRange(stars)
    const quickAttr = ATTRIBUTE_QUICK_TAGS.find((x) => x.key === activeQuickAttrKey) || null
    const query = [
      `city=${encodeURIComponent(normalizedCity || city || '')}`,
      `keyword=${encodeURIComponent(keyword || '')}`,
      `checkIn=${encodeURIComponent(checkIn || '')}`,
      `checkOut=${encodeURIComponent(checkOut || '')}`,
      `min_price=${encodeURIComponent(toCentString(minPrice))}`,
      `max_price=${encodeURIComponent(toCentString(maxPrice))}`,
      `rooms_count=${roomsCount}`,
      `adults=${adultCount}`
    ]

    if (minStar && maxStar) {
      query.push(`min_star=${minStar}`)
      query.push(`max_star=${maxStar}`)
    }
    if (quickAttr?.minStar) query.push(`min_star=${quickAttr.minStar}`)
    if (quickAttr?.maxStar) query.push(`max_star=${quickAttr.maxStar}`)
    if (quickAttr?.maxPriceYuan) query.push(`max_price=${encodeURIComponent(String(Math.round(quickAttr.maxPriceYuan * 100)))}`)
    if (quickAttr?.breakfast) query.push('breakfast=true')
    if (quickAttr?.refundable) query.push('refundable=true')

    Taro.navigateTo({
      url: `/pages/hotelList/hotelList?${query.join('&')}`
    })
  }

  const openCalendar = () => {
    setTempCheckIn(checkIn)
    setTempCheckOut(checkOut)
    setShowCalendar(true)
  }

  const handleConfirmDate = () => {
    if (!tempCheckIn || !tempCheckOut) {
      Taro.showToast({ title: '请选择完整日期', icon: 'none' })
      return
    }
    setCheckIn(tempCheckIn)
    setCheckOut(tempCheckOut)
    setShowCalendar(false)
  }

  const applyPreset = (preset) => {
    setCity(preset.city)
    setKeyword(preset.keyword)
    // 热门示例用于快速体验，默认清空额外筛选，避免被残留条件筛空
    setMinPrice('')
    setMaxPrice('')
    setStars([])
    setActiveQuickAttrKey('')
  }

  const handleSelectCity = (nextCity) => {
    if (!DEMO_OPEN_CITIES.has(nextCity)) {
      Taro.showToast({ title: `${nextCity} 暂无演示数据`, icon: 'none' })
      return
    }
    setCity(nextCity)
    setShowCityPicker(false)
  }

  const selectedDomesticGroup =
    DOMESTIC_LETTER_GROUPS.find((group) => group.letter === domesticLetter) || DOMESTIC_LETTER_GROUPS[0] || null

  const goCitySpot = (targetCity, targetKeyword) => {
    Taro.navigateTo({
      url: `/pages/hotelList/hotelList?city=${encodeURIComponent(targetCity)}&keyword=${encodeURIComponent(targetKeyword || '')}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&min_price=${encodeURIComponent(toCentString(minPrice))}&max_price=${encodeURIComponent(toCentString(maxPrice))}&rooms_count=${roomsCount}&adults=${adultCount}`,
    })
  }

  const starSummary = stars.length > 0 ? stars.join(' / ') : '不限星级'
  const guestSummary = `${roomsCount}间房 · ${adultCount}位住客`
  const normalizedCity = normalizeCityName(city)
  const currentExamples = DESTINATION_EXAMPLES[normalizedCity] || ['酒店名', '商圈', '景点']
  const destinationExampleText = `例如：${currentExamples.join('、')}`
  const destinationPlaceholder = `输入酒店名、商圈、地标（如${currentExamples[0]}）`

  const openHotelDetail = (hotelId) => {
    if (!hotelId) return
    Taro.navigateTo({
      url: `/pages/hotelDetail/index?id=${hotelId}&check_in=${encodeURIComponent(checkIn || '')}&check_out=${encodeURIComponent(checkOut || '')}&rooms_count=${roomsCount}&adults=${adultCount}`,
    })
  }

  const handleGetLocationByIP = async ({ silent = false, skipLoading = false } = {}) => {
    try {
      if (!skipLoading) Taro.showLoading({ title: '定位中...' })
      const res = await Taro.request({
        url: 'https://apis.map.qq.com/ws/location/v1/ip',
        data: { key: QQ_MAP_KEY },
        method: 'GET'
      })
      if (res.data.status === 0) {
        const nextCity = normalizeCityName(res.data.result?.ad_info?.city)
        if (!nextCity) throw new Error('empty city from ip')
        setCity(nextCity)
        if (!silent) Taro.showToast({ title: `当前城市：${nextCity}`, icon: 'none' })
        return nextCity
      } else {
        throw new Error(res.data.message)
      }
    } catch (err) {
      console.error('IP定位失败：', err)
      if (!silent) Taro.showToast({ title: '定位失败，请手动选择', icon: 'none' })
      throw err
    } finally {
      if (!skipLoading) Taro.hideLoading()
    }
  }

  const reverseGeocodeCity = async (latitude, longitude) => {
    const res = await Taro.request({
      url: 'https://apis.map.qq.com/ws/geocoder/v1/',
      method: 'GET',
      data: {
        key: QQ_MAP_KEY,
        location: `${latitude},${longitude}`,
      },
    })
    if (res.data?.status !== 0) throw new Error(res.data?.message || 'reverse geocode failed')
    const cityName =
      res.data?.result?.address_component?.city ||
      res.data?.result?.ad_info?.city ||
      ''
    const nextCity = normalizeCityName(cityName)
    if (!nextCity) throw new Error('empty city from reverse geocode')
    return nextCity
  }

  const handleLocate = async ({ silent = false } = {}) => {
    Taro.showLoading({ title: '定位中...' })
    try {
      const geo = await Taro.getLocation({ type: 'gcj02' })
      const nextCity = await reverseGeocodeCity(geo.latitude, geo.longitude)
      setCity(nextCity)
      if (!silent) Taro.showToast({ title: `定位成功：${nextCity}`, icon: 'none' })
      return nextCity
    } catch (err) {
      console.error('GPS定位失败，尝试IP定位:', err)
      try {
        const nextCity = await handleGetLocationByIP({ silent: true, skipLoading: true })
        if (!silent) Taro.showToast({ title: `已切换到IP定位：${nextCity}`, icon: 'none' })
        return nextCity
      } catch {
        setCity('上海')
        if (!silent) Taro.showToast({ title: '定位失败，已默认上海', icon: 'none' })
        return '上海'
      }
    } finally {
      Taro.hideLoading()
    }
  }


  return (
    <View className='home'>
      <View className='hero'>
        {banners.length ? (
          <Swiper indicatorDots autoplay circular className='hero-swiper'>
            {banners.map((item) => (
              <SwiperItem key={item.id || item.title}>
                <View className='hero-slide' onClick={() => openHotelDetail(item.id)}>
                  <Image
                    className='hero-img'
                    src={item.image || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'}
                    mode='aspectFill'
                  />
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        ) : (
          <Image
            className='hero-img'
            src='https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'
            mode='aspectFill'
          />
        )}
        <View className='hero-overlay'>
          <View className='hero-top'>
            <Text className='hero-badge'>Easy Stay</Text>
            <Text className='hero-chip'>{city === '定位中...' ? '定位中' : `${city} 热门`}</Text>
          </View>
          <View className='hero-sub'>
            <Text className='hero-title'>酒店与住宿</Text>
            {!!banners.length && (
              <Text className='hero-banner-tip'>
                {banners[0]?.title || '精选酒店广告'} · 点击顶部图片查看详情
              </Text>
            )}
            {/* <Text className='hero-sub'>中文城市数据已接通，支持筛选与附近点位排序</Text> */}
          </View>
        </View>
      </View>

      <View className='search-card'>
        <View className='search-header'>
          <View className='search-subtitle'>
              <View className='search-local' onClick={() => handleLocate()}>定位</View>
            <View className='location-icon' /> 
            <View className='city-pill' onClick={() => setShowCityPicker(true)}>
              {city}
            </View>
            {/* <Text className='search-subtitle'>选择城市、日期与预算，进入酒店列表页</Text> */}
          </View>
          <View className='city-pill' onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}>
            我的
          </View>
        </View>

        <View className='field-card'>
          <View className='field-row'>
            <View className='field-main'>
              <View className='field-icon'>搜</View>
              <View className='field-label-wrap'>
                <Text className='field-label'>目的地 / 商圈 / 景点</Text>
                <Text className={`field-value ${keyword ? '' : 'field-value-light'}`}>
                  {keyword || destinationExampleText}
                </Text>
              </View>
            </View>
          </View>
          <View className='search-input-wrap'>
            <Input
              className='search-input'
              value={keyword}
              placeholder={destinationPlaceholder}
              maxlength={24}
              onInput={(e) => setKeyword(clampText(e.detail.value, 24))}
            />
          </View>
        </View>

        <View className='field-card' onClick={openCalendar}>
          <View className='field-row'>
            <View className='field-main'>
              <View className='field-icon'>日</View>
              <View className='field-label-wrap'>
                <Text className='field-label'>入住 - 离店</Text>
                <Text className='field-value field-value-small'>
                  {formatDate(checkIn)} - {formatDate(checkOut)}
                </Text>
              </View>
            </View>
            <View className='night-pill'>共 {nights} 晚</View>
          </View>
        </View>

        <View className='grid-2'>
          <View className='mini-card'>
            <Text className='mini-label'>酒店星级</Text>
            <View className='star-select-box' onClick={() => setShowStarSelect(true)}>
              {starSummary}
            </View>
          </View>

          <View className='mini-card'>
            <Text className='mini-label'>价格区间（元）</Text>
            <View className='price-box'>
              <Input
                style={{}}
                placeholder='最低'placeholderStyle='line-height: 54rpx; color: #999;'
                type='number'
                value={minPrice}
                maxlength={7}
                onInput={(e) => setMinPrice(clampDigits(e.detail.value, 7))}
              />
              <Text className='price-divider'>-</Text>
              <Input
                placeholder='最高'
                type='number'
                value={maxPrice}
                maxlength={7}
                onInput={(e) => setMaxPrice(clampDigits(e.detail.value, 7))}
              />
            </View>
          </View>
        </View>

        <View className='field-card' onClick={() => setShowGuestSheet(true)}>
          <View className='field-row'>
            <View className='field-main'>
              <View className='field-icon'>住</View>
              <View className='field-label-wrap'>
                <Text className='field-label'>房间与住客</Text>
                <Text className='field-value field-value-small'>{guestSummary}</Text>
              </View>
            </View>
            <View className='night-pill'>修改</View>
          </View>
        </View>

        <View className='quick-section'>
          <Text className='section-label'>快捷标签（属性）</Text>
          <View className='quick-chips'>
            {ATTRIBUTE_QUICK_TAGS.map((item) => {
              const active = activeQuickAttrKey === item.key
              return (
                <View
                  key={item.key}
                  className={`quick-chip ${active ? 'quick-chip-active' : ''}`}
                  onClick={() => setActiveQuickAttrKey((v) => (v === item.key ? '' : item.key))}
                >
                  {item.label}
                </View>
              )
            })}
          </View>
        </View>

        <View className='quick-section'>
          <Text className='section-label'>热门搜索示例</Text>
          <View className='quick-chips'>
            {QUICK_PRESETS.map((item) => {
              const active = city === item.city && keyword === item.keyword
              return (
                <View
                  key={`${item.city}-${item.keyword}`}
                  className={`quick-chip ${active ? 'quick-chip-active' : ''}`}
                  onClick={() => applyPreset(item)}
                >
                  {item.label}
                </View>
              )
            })}
          </View>
        </View>

        <Button className='search-btn' onClick={handleSearch}>
          查询酒店
        </Button>
      </View>

      <View className='panel'>
        <View className='panel-head'>
          <Text className='panel-title'>定位推荐</Text>
          <Text className='panel-link'>{normalizedCity || city || '当前城市'}</Text>
        </View>
        {featuredLoading ? (
          <View className='recommend-empty'>正在加载定位推荐...</View>
        ) : featuredHotels.length ? (
          <View className='recommend-list'>
            {featuredHotels.slice(0, 4).map((item) => (
              <View
                key={item.id}
                className='recommend-item'
                onClick={() => openHotelDetail(item.id)}
              >
                <Image
                  className='recommend-cover'
                  mode='aspectFill'
                  src={item.cover || `https://picsum.photos/seed/${item.id}/480/320`}
                />
                <View className='recommend-body'>
                  <Text className='recommend-name'>{item.name_cn}</Text>
                  <Text className='recommend-meta'>
                    {item.city} · {Number(item.rating || 0).toFixed(1)}分 · {item.star || '-'}星
                  </Text>
                  <Text className='recommend-price'>
                    ¥{toYuanText(item.min_price)} 起
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className='recommend-empty'>当前城市暂无推荐，试试手动选择城市</View>
        )}
      </View>

      <View className='panel'>
        <View className='panel-head'>
          <Text className='panel-title'>热门城市</Text>
        </View>
        <View className='dest-row'>
          {[
            { city: '上海', sub: '外滩 / 陆家嘴', cls: 'dest-card-1', keyword: '外滩' },
            { city: '成都', sub: '春熙路 / 太古里', cls: 'dest-card-2', keyword: '春熙路' },
            { city: '杭州', sub: '西湖 / 龙翔桥', cls: 'dest-card-3', keyword: '西湖' }
          ].map((item) => (
            <View
              key={item.city}
              className={`dest-card ${item.cls}`}
              onClick={() => goCitySpot(item.city, item.keyword)}
            >
              <View className='dest-card-content'>
                <Text className='dest-name'>{item.city}</Text>
                <Text className='dest-sub'>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {showCityPicker && (
        <View className='mask' onClick={() => setShowCityPicker(false)}>
          <View className='popup city-popup' onClick={(e) => e.stopPropagation()}>
            <View className='popup-header'>
              <Text className='popup-title'>选择城市</Text>
              <Text className='popup-close' onClick={() => setShowCityPicker(false)}>关闭</Text>
            </View>
            <ScrollView scrollY className='popup-body'>
              {CITY_PICKER_SECTIONS.map((section) => (
                <View key={section.key} className='city-section'>
                  <Text className='city-section-title'>{section.title}</Text>
                  {section.key === 'domestic' && DOMESTIC_LETTER_GROUPS.length ? (
                    <ScrollView scrollX className='city-letter-scroll' enableFlex>
                      <View className='city-letter-row'>
                        {DOMESTIC_LETTER_GROUPS.map((group) => (
                          <View
                            key={group.letter}
                            className={`city-letter-chip ${domesticLetter === group.letter ? 'city-letter-chip-active' : ''}`}
                            onClick={() => setDomesticLetter(group.letter)}
                          >
                            {group.letter}
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  ) : null}
                  <View className='city-grid'>
                    {(section.key === 'domestic' ? (selectedDomesticGroup?.cities || []) : section.cities).map((item) => {
                      const active = city === item
                      const disabled = !DEMO_OPEN_CITIES.has(item)
                      return (
                        <View
                          key={`${section.key}-${item}`}
                          className={`city-tag ${active ? 'active-city' : ''} ${disabled ? 'city-tag-disabled' : ''}`}
                          onClick={() => handleSelectCity(item)}
                        >
                          {item}
                          {disabled ? <Text className='city-tag-badge'>演示未开</Text> : null}
                        </View>
                      )
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {showCalendar && (
        <View className='mask' onClick={() => setShowCalendar(false)}>
          <View className='popup' onClick={(e) => e.stopPropagation()}>
            <Text className='calendar-title'>选择入住和离店日期</Text>
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

              {dateList.map((date, idx) => {
                if (!date) return <View key={`blank-${idx}`} className='sheet-day blank' />;
                const onlyCheckInSelected = tempCheckIn && !tempCheckOut
                const isPast = dayjs(date).isBefore(todayDate, 'day')
                const isDisabled =
                  isPast ||
                  (onlyCheckInSelected &&
                    dayjs(date).isBefore(dayjs(tempCheckIn), 'day'))
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

            <Button className='calendar-btn' onClick={handleConfirmDate}>
              确定日期
            </Button>
          </View>
        </View>
      )}

      {showStarSelect && (
        <View className='mask' onClick={() => setShowStarSelect(false)}>
          <View className='popup star-popup' onClick={(e) => e.stopPropagation()}>
            <View className='popup-header'>
              <Text className='popup-title'>选择星级</Text>
              <Text className='popup-close' onClick={() => setStars([])}>重置</Text>
            </View>

            <View className='star-grid'>
              {STAR_OPTIONS.map((item) => {
                const active = item === '不限' ? stars.length === 0 : stars.includes(item)
                return (
                  <View
                    key={item}
                    className={`star-item ${active ? 'active-star' : ''}`}
                    onClick={() => {
                      if (item === '不限') {
                        setStars([])
                        return
                      }

                      if (stars.includes(item)) {
                        setStars(stars.filter(s => s !== item))
                      } else {
                        setStars([...stars, item])
                      }
                    }}
                  >
                    {item}
                  </View>
                )
              })}
            </View>

            <View className='star-footer'>
              <Button className='star-confirm-btn' onClick={() => setShowStarSelect(false)}>
                确定
              </Button>
            </View>
          </View>
        </View>
      )}

      {showGuestSheet && (
        <View className='mask' onClick={() => setShowGuestSheet(false)}>
          <View className='popup' onClick={(e) => e.stopPropagation()}>
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
              <Text className='counter-label'>成人</Text>
              <View className='counter-actions'>
                <View className='counter-btn' onClick={() => setAdultCount(v => Math.max(1, v - 1))}>-</View>
                <Text className='counter-value'>{adultCount}</Text>
                <View className='counter-btn' onClick={() => setAdultCount(v => Math.min(8, v + 1))}>+</View>
              </View>
            </View>

            <Button className='calendar-btn' onClick={() => setShowGuestSheet(false)}>
              确定
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}

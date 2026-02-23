import {
  View,
  Text,
  Image,
  Input,
  Button,
  ScrollView
} from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import './index.css'

const CITY_OPTIONS = ['上海', '北京', '广州', '深圳', '杭州', '成都', '东京', '新加坡']
const STAR_OPTIONS = ['不限', '经济', '三星', '四星', '五星']

const QUICK_PRESETS = [
  { label: '外滩夜景', city: '上海', keyword: '外滩' },
  { label: '国贸商务', city: '北京', keyword: '国贸' },
  { label: '西湖度假', city: '杭州', keyword: '西湖' },
  { label: '春熙路', city: '成都', keyword: '春熙路' }
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
  const [stars, setStars] = useState([])
  const [roomsCount, setRoomsCount] = useState(1)
  const [adultCount, setAdultCount] = useState(2)

  const daysInMonth = dayjs(`${currentYear}-${currentMonth + 1}-01`).daysInMonth()
  const dateList = Array.from({ length: daysInMonth }).map((_, i) =>
    dayjs(`${currentYear}-${currentMonth + 1}-${i + 1}`).format('YYYY-MM-DD')
  )

  useEffect(() => {
    Taro.getLocation({
      type: 'gcj02',
      success: () => setCity('上海'),
      fail: () => setCity('上海')
    })
  }, [])

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
    const query = [
      `city=${encodeURIComponent(city || '')}`,
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
  }

  const goCitySpot = (targetCity, targetKeyword) => {
    Taro.navigateTo({
      url: `/pages/hotelList/hotelList?city=${encodeURIComponent(targetCity)}&keyword=${encodeURIComponent(targetKeyword || '')}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&min_price=${encodeURIComponent(toCentString(minPrice))}&max_price=${encodeURIComponent(toCentString(maxPrice))}&rooms_count=${roomsCount}&adults=${adultCount}`,
    })
  }

  const starSummary = stars.length > 0 ? stars.join(' / ') : '不限星级'
  const guestSummary = `${roomsCount}间房 · ${adultCount}位住客`
  const currentExamples = DESTINATION_EXAMPLES[city] || ['酒店名', '商圈', '景点']
  const destinationExampleText = `例如：${currentExamples.join('、')}`
  const destinationPlaceholder = `输入酒店名、商圈、地标（如${currentExamples[0]}）`

  return (
    <View className='home'>
      <View className='hero'>
        <Image
          className='hero-img'
          src='https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'
          mode='aspectFill'
        />
        <View className='hero-overlay'>
          <View className='hero-top'>
            <Text className='hero-badge'>Easy Stay</Text>
            <Text className='hero-chip'>{city === '定位中...' ? '定位中' : `${city} 热门`}</Text>
          </View>
          <View>
            <Text className='hero-title'>酒店与住宿</Text>
            <Text className='hero-sub'>中文城市数据已接通，支持筛选与附近点位排序</Text>
          </View>
        </View>
      </View>

      <View className='search-card'>
        <View className='search-header'>
          <View>
            <Text className='search-title'>开始搜索</Text>
            <Text className='search-subtitle'>选择城市、日期与预算，进入酒店列表页</Text>
          </View>
          <View style={{ display: 'flex', gap: '8rpx' }}>
            <View className='city-pill' onClick={() => setShowCityPicker(true)}>
              {city}
            </View>
            <View className='city-pill' onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}>
              我的
            </View>
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
                placeholder='最低'
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
          <Text className='section-label'>热门搜索示例（点击填充）</Text>
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

        <View className='trust-row'>
          <View className='trust-dot' />
          <Text>已接通后端真实酒店数据与筛选参数</Text>
        </View>
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
              <View className='city-grid'>
                {CITY_OPTIONS.map((item) => {
                  const active = city === item
                  return (
                    <View
                      key={item}
                      className={`city-tag ${active ? 'active-city' : ''}`}
                      onClick={() => {
                        setCity(item)
                        setShowCityPicker(false)
                      }}
                    >
                      {item}
                    </View>
                  )
                })}
              </View>
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
              {dateList.map((date) => {
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

import {
  View,
  Text,
  ScrollView,
  Input,
  Button
} from '@tarojs/components'
import Taro, { useReachBottom } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import './hotelList.css'
import '../index/index.css'

export default function HotelList() {

    /* ========= 读取首页参数 ========= */

    const router = Taro.getCurrentInstance().router
    const params = router?.params || {}

    const {
    keyword = '',
    min_price = '',
    max_price = '',
    min_star = '',
    max_star = '',
    tags = ''
    } = params

    /* ========= 页面状态 ========= */

    const [hotelList, setHotelList] = useState([])
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)

    const [searchKeyword, setSearchKeyword] = useState(keyword)
    const [sort, setSort] = useState('recommended')
    const [showSort, setShowSort] = useState(false)

    const [selectedStars, setSelectedStars] = useState([])
    const [minPrice, setMinPrice] = useState(min_price)
    const [maxPrice, setMaxPrice] = useState(max_price)
    const [selectedTag, setSelectedTag] = useState(tags)

    const [showDrawer, setShowDrawer] = useState(false)
    const [showCityDrawer, setShowCityDrawer] = useState(false)


    
  const [city, setCity] = useState(params.city)
    const [tempCity, setTempCity] = useState(city)
  const [showCityPicker, setShowCityPicker] = useState(false)
  const cities = ['上海', '北京', '广州', '深圳', '杭州']
  const [showCalendar, setShowCalendar] = useState(false)
    const [currentYear, setCurrentYear] = useState(dayjs().year())
    const [currentMonth, setCurrentMonth] = useState(dayjs().month())
    const [checkIn, setCheckIn] = useState(params.checkIn)
    const [checkOut, setCheckOut] = useState(params.checkOut)
    const [tempCheckIn, setTempCheckIn] = useState(null)
    const [tempCheckOut, setTempCheckOut] = useState(null)
      const daysInMonth = dayjs(`${currentYear}-${currentMonth + 1}-01`).daysInMonth()
      const dateList = Array.from({ length: daysInMonth }).map((_, i) => {
        return dayjs(`${currentYear}-${currentMonth + 1}-${i + 1}`).format('YYYY-MM-DD')
      })
    
      const weekMap = ['日', '一', '二', '三', '四', '五', '六']
      const formatDate = (date) => {
        const d = dayjs(date)
        return `${d.format('MM/DD')} 周${weekMap[d.day()]}`
      }
        const openCalendar = () => {
          setTempCheckIn(checkIn)
          setTempCheckOut(checkOut)
          setShowCalendar(true)
        }
      
        
        const handleConfirm = () => {
          if (!tempCheckIn || !tempCheckOut) {
            Taro.showToast({
              title: '请选择完整日期',
              icon: 'none'
            })
            return
          }
          if (tempCheckIn && tempCheckOut) {
            setCheckIn(tempCheckIn)
            setCheckOut(tempCheckOut)
          }
          setShowCalendar(false)
        }

    const nights = checkIn && checkOut
    ? dayjs(checkOut).diff(dayjs(checkIn), 'day')
    : 0

    /* ========= 构造查询参数 ========= */

    const buildQuery = () => {
    const query = {
        city,
        page,
        limit: 20,
        sort
    }

    if (searchKeyword) query.keyword = searchKeyword
    if (checkIn) query.check_in = checkIn
    if (checkOut) query.check_out = checkOut
    if (minPrice) query.min_price = minPrice
    if (maxPrice) query.max_price = maxPrice
    if (selectedStars.length) {
        query.min_star = Math.min(...selectedStars)
        query.max_star = Math.max(...selectedStars)
    }
    if (selectedTag) query.tags = selectedTag

    return query
    }

    /* ========= 请求数据 ========= */

    const fetchHotels = async (reset = false) => {
    if (loading) return
    setLoading(true)

    const res = await Taro.request({
        url: 'http://localhost:3000/hotels',
        method: 'GET',
        data: buildQuery()
    })

    if (res.data?.items) {
        setTotal(res.data.total)
        if (reset) {
        setHotelList(res.data.items)
        } else {
        setHotelList(prev => [...prev, ...res.data.items])
        }
    }

    setLoading(false)
    }

    useEffect(() => {
    fetchHotels(true)
    }, [sort])

    useEffect(() => {
    if (page > 1) fetchHotels()
    }, [page])

    useReachBottom(() => {
    if (hotelList.length >= total) return
    setPage(p => p + 1)
    })

    /* ========= 星级选择 ========= */

    const starOptions = [
    { label: '经济', value: 2 },
    { label: '三星', value: 3 },
    { label: '四星', value: 4 },
    { label: '五星', value: 5 }
    ]

    const toggleStar = (val) => {
    if (selectedStars.includes(val)) {
        setSelectedStars(selectedStars.filter(s => s !== val))
    } else {
        setSelectedStars([...selectedStars, val])
    }
    }

    /* ===================== JSX ===================== */

    return (
    <View className='hotel-page'>

        {/* ========= 第一行 ========= */}

        <View className='top-bar'>

        <View
            className='city'
            onClick={() => {
            setTempCity(city)
            setShowCityPicker(true)
            }}
        >
            {city}
        </View>

        <View
            className='date-block'
            onClick={() => {
            setTempCheckIn(checkIn)
            setTempCheckOut(checkOut)
            setShowCalendar(true)
            }}
        >
            <Text>住：{dayjs(checkIn).format('MM月DD日')}</Text>
            <Text>离：{dayjs(checkOut).format('MM月DD日')}</Text>
        </View>

        <View className='nights'>共{nights}晚</View>

        <Input
            className='search-input'
            value={searchKeyword}
            placeholder='搜索酒店'
            onInput={e => setSearchKeyword(e.detail.value)}
        />

        <View className='loc-icon'>📍</View>

        </View>

        {/* ========= 第二行 ========= */}

        <View className='filter-bar'>

        <View
            className='sort-item'
            onClick={() => setShowSort(!showSort)}
        >
            排序方式 <Text className='arrow'>▼</Text>
        </View>

        <View onClick={() => setShowDrawer(true)}>星级</View>
        <View onClick={() => setShowDrawer(true)}>价格</View>
        <View onClick={() => setShowDrawer(true)}>筛选</View>

        </View>

        {/* 排序下拉 */}

        {showSort && (
        <View
            className='mask'
            onClick={() => setShowSort(false)}
        >
            <View
            className='sort-dropdown'
            onClick={e => e.stopPropagation()}
            >
            {[
                { label: '推荐排序', value: 'recommended' },
                { label: '价格升序', value: 'price_asc' },
                { label: '价格降序', value: 'price_desc' },
                { label: '评分最高', value: 'rating_desc' }
            ].map(item => (
                <View
                key={item.value}
                className='sort-option'
                onClick={() => {
                    setSort(item.value)
                    setShowSort(false)
                    setPage(1)
                    fetchHotels(true)
                }}
                >
                {item.label}
                </View>
            ))}
            </View>
        </View>
        )}

        {/* ========= 第三行 Tags ========= */}

        <ScrollView scrollX className='tag-bar'>
        {['含早餐', '免费取消', '近地铁', '可订'].map(tag => (
            <View
            key={tag}
            className={`tag-item ${selectedTag === tag ? 'active-tag' : ''}`}
            onClick={() => {
                setSelectedTag(tag)
                setPage(1)
                fetchHotels(true)
            }}
            >
            {tag}
            </View>
        ))}
        </ScrollView>

        {/* ========= 酒店列表 ========= */}

        <ScrollView scrollY className='list'>
        {hotelList.map(item => (
            <View key={item.id} className='hotel-card'>
            <View className='hotel-img'></View>
            <View className='hotel-info'>
                <View className='hotel-name'>{item.name}</View>
                <View className='hotel-rating'>{item.rating}分</View>
                <View className='hotel-price'>
                ¥{item.min_nightly_price / 100}
                </View>
            </View>
            </View>
        ))}
        {loading && <View className='loading'>加载中...</View>}
        </ScrollView>


        
      {/* ================= 城市弹层 ================= */}
      {showCityPicker && (
        <View
          className='mask'
          onClick={() => setShowCityPicker(false)}>
          <View
            className='popup city-popup'
            onClick={(e) => e.stopPropagation()} >
            <View className='popup-header'>
              <Text className='popup-title'>选择城市</Text>
            </View>
            <ScrollView scrollY className='popup-body'>
              <View className='city-grid'>
                {cities.map((item, index) => {
                  const active = city === item
                  return (
                    <View
                      key={index}
                      className={`city-tag ${active ? 'active-city' : ''}`}
                      onClick={() => {
                        setCity(item)
                        setShowCityPicker(false)
                      }}>
                      {item}
                    </View>
                  )
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

              {/* ================= 日历弹层 ================= */}
      {showCalendar && (
        <View
          className='mask'
          onClick={() => setShowCalendar(false)}
          //onClick={openCalendar}
          >
          <View
            className='popup'
            onClick={(e) => e.stopPropagation()}>
            <Text className='calendar-title'>选择入住和离店日期</Text>
            <View className='calendar-header'>
              <View
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentYear(currentYear - 1)
                    setCurrentMonth(11)
                  } else {
                    setCurrentMonth(currentMonth - 1)
                  }
                }}>
                ◀
              </View>

              <Text>
                {currentYear}年 {currentMonth + 1}月
              </Text>

              <View
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentYear(currentYear + 1)
                    setCurrentMonth(0)
                  } else {
                    setCurrentMonth(currentMonth + 1)
                  }
                }}>
                ▶
              </View>
            </View>

           <View className='calendar-grid'>
            {dateList.map((date, index) => {
              const onlyCheckInSelected = tempCheckIn && !tempCheckOut
              const isDisabled =
                onlyCheckInSelected &&
                dayjs(date).isBefore(dayjs(tempCheckIn), 'day')
              const isSelected =
                date === tempCheckIn || date === tempCheckOut
              const isInRange =
                tempCheckIn &&
                tempCheckOut &&
                dayjs(date).isAfter(dayjs(tempCheckIn), 'day') &&
                dayjs(date).isBefore(dayjs(tempCheckOut), 'day')


              return (
                <View
                  key={index}
                  className={`calendar-day 
                    ${isSelected ? 'active' : ''} 
                    ${isInRange ? 'in-range' : ''} 
                    ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => {
                    if (isDisabled) return
                    if (!tempCheckIn || (tempCheckIn && tempCheckOut)) {
                      setTempCheckIn(date)
                      setTempCheckOut('')
                    } else {
                      if (dayjs(date).isAfter(tempCheckIn)) {
                        setTempCheckOut(date)
                      } else {
                        setTempCheckIn(date)
                        setTempCheckOut('')
                      }
                    }

                      }} >
                  {dayjs(date).date()}
                </View>
              )
            })}

          </View>
            <Button
              className='calendar-btn'
              //onClick={() => setShowCalendar(false)}
              onClick={handleConfirm}
              >
              确定
            </Button>
          </View>
        </View>
      )}



        {/* ========= 右侧筛选弹层 ========= */}

        {showDrawer && (
        <View
            className='overlay'
            onClick={() => setShowDrawer(false)}
        >
            <View
            className='drawer'
            onClick={e => e.stopPropagation()}
            >
            <Text className='drawer-title'>星级</Text>

            <View className='star-options'>
                {starOptions.map(s => (
                <View
                    key={s.value}
                    className={`star-item ${selectedStars.includes(s.value) ? 'active-star' : ''}`}
                    onClick={() => toggleStar(s.value)}
                >
                    {s.label}
                </View>
                ))}
            </View>

            <Text className='drawer-title'>价格区间</Text>

            <Input
                placeholder='最低价'
                value={minPrice}
                onInput={e => setMinPrice(e.detail.value)}
            />
            <Input
                placeholder='最高价'
                value={maxPrice}
                onInput={e => setMaxPrice(e.detail.value)}
            />

            <View
                className='confirm-btn'
                onClick={() => {
                setPage(1)
                setShowDrawer(false)
                fetchHotels(true)
                }}
            >
                确定
            </View>

            </View>
        </View>
        )}

    </View>
    )
}
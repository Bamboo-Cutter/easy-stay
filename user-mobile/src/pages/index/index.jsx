import {
  View,
  Text,
  Image,
  Input,
  Button,
  ScrollView
} from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import './index.css'

export default function Home() {

  /* ---------------- 状态 ---------------- */

  const [city, setCity] = useState('定位中...')
  const [keyword, setKeyword] = useState('')
  const [checkIn, setCheckIn] = useState(dayjs().format('YYYY-MM-DD'))
  const [checkOut, setCheckOut] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'))
  const [tempCheckIn, setTempCheckIn] = useState(null)
  const [tempCheckOut, setTempCheckOut] = useState(null)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedTags, setSelectedTags] = useState([])
  const [currentYear, setCurrentYear] = useState(dayjs().year())
  const [currentMonth, setCurrentMonth] = useState(dayjs().month())
  const [showCityPicker, setShowCityPicker] = useState(false)
  const cities = ['上海', '北京', '广州', '深圳', '杭州']
  const [showStarSelect, setShowStarSelect] = useState(false)
  const [stars, setStars] = useState([])
  const starOptions = ['不限', '经济', '三星', '四星', '五星']
  const tags = ['亲子酒店', '豪华酒店', '免费停车', '含早餐', '近地铁']

  const daysInMonth = dayjs(`${currentYear}-${currentMonth + 1}-01`).daysInMonth()
  const dateList = Array.from({ length: daysInMonth }).map((_, i) => {
    return dayjs(`${currentYear}-${currentMonth + 1}-${i + 1}`).format('YYYY-MM-DD')
  })


  /* ---------------- 自动定位 ---------------- */

  useEffect(() => {
    Taro.getLocation({
      type: 'gcj02',
      success: () => {
        setCity('上海')
      },
      fail: () => {
        setCity('上海')
      }
    })
  }, [])

  /* ---------------- 计算入住晚数 ---------------- */
  const nights = dayjs(checkOut).diff(dayjs(checkIn), 'day')
  const weekMap = ['日', '一', '二', '三', '四', '五', '六']
  const formatDate = (date) => {
    const d = dayjs(date)
    return `${d.format('MM/DD')} 周${weekMap[d.day()]}`
  }

  const getStarRange = (stars) => {
    // 星级映射表
    const starMap = {
      '经济': 1,
      '三星': 3,
      '四星': 4,
      '五星': 5
    };

    // 数组为空或无效的情况
    if (!stars || stars.length === 0) {
      return [0, 5];
    }

    // 转换并过滤有效星级
    const starValues = stars
      .filter(star => starMap[star] !== undefined)
      .map(star => starMap[star]);

    // 无有效值时返回默认值
    if (starValues.length === 0) {
      return [0, 5];
    }

    return [
      Math.min(...starValues),
      Math.max(...starValues)
    ];
  }

  /* ---------------- 查询 ---------------- */
  const handleSearch = () => {
    console.log(stars)
    const [minStar, maxStar] = getStarRange(stars)
    console.log(city)
    console.log(keyword)
    console.log(checkIn)
    console.log(checkOut)
    console.log(minPrice)
    console.log(maxPrice)
    console.log(minStar)
    console.log(maxStar)
    console.log(selectedTags)

    Taro.navigateTo({
      // url: `/pages/hotelList/index?city=${city}&checkIn=${checkIn}&checkOut=${checkOut}&star=${star}&minPrice=${minPrice}&maxPrice=${maxPrice}&keyword=${keyword}`
      url: `/pages/hotelList/hotelList?city=${city}&keyword=${keyword || ''}&checkIn=${checkIn}&checkOut=${checkOut}&min_price=${minPrice || ''}&max_price=${maxPrice || ''}&min_star=${String(minStar) || ''}&max_star=${String(maxStar) || ''}&tags=${selectedTags.join(',')}`
    })
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

  return (
    <View className='home'>

      {/* ================= Banner ================= */}
      <View
        className='banner'
        onClick={() =>
          Taro.navigateTo({
            url: '/pages/hotelDetail/index?id=1'
          })}>
        <Image
          className='banner-img'
          src='https://picsum.photos/800/300'
          mode='aspectFill'/>
        <View className='banner-mask'>
          <Text className='banner-text'>酒店7折起</Text>
        </View>
      </View>

      {/* ================= 查询卡片 ================= */}
      <View className='search-card'>
        {/* 第一行 */}
        <View className='row'>
          <View
            className='location'
            onClick={() => setShowCityPicker(true)}
          >
            <Text className='city'>{city}</Text>
          </View>

          <View className='search-input'>
            <Input
              placeholder='位置/品牌/酒店'
              value={keyword}
              onInput={(e) => setKeyword(e.detail.value)}
            />
          </View>
        </View>

        {/* 第二行 */}
        <View className='row'>
          <View
            className='date-box'
            //onClick={() => setShowCalendar(true)}
            onClick={openCalendar}
          >
            <Text className='date-text'>{formatDate(checkIn)}</Text>
            <Text className='date-divider'>-</Text>
            <Text className='date-text'>{formatDate(checkOut)}</Text>
          </View>

          <View
            className='nights'
            //onClick={() => setShowCalendar(true)}
            onClick={openCalendar}
          >
            <Text>共 {nights} 晚</Text>
          </View>
        </View>

        {/* 第三行 */}
        <View className='row'>
          <View className='star-row'>
            <Text className='.form-label'>酒店星级</Text>

            <View
              className='star-select-box'
              onClick={() => setShowStarSelect(true)}
            >
            {stars.length > 0 ? stars.join(' / ') : '不限星级（请选择）'}
            </View>
          </View>
          
          <View className='price-box'>
            <Input
              placeholder='最低价'
              type='number'
              value={minPrice}
              onInput={(e) => setMinPrice(e.detail.value)}
            />
            <Text>-</Text>
            <Input
              placeholder='最高价'
              type='number'
              value={maxPrice}
              onInput={(e) => setMaxPrice(e.detail.value)}
            />
          </View>
        </View>

        {/* 第四行 Tags */}
        <View className='tags'>
          {tags.map((item, index) => {
            const active = selectedTags.includes(item)
            return (
              <View
                key={index}
                className={`tag ${active ? 'tag-active' : ''}`}
                onClick={() => {
                  if (active) {
                    setSelectedTags(selectedTags.filter(t => t !== item))
                  } else {
                    setSelectedTags([...selectedTags, item])
                  }
                }}
              >
                <Text>{item}</Text>
              </View>
            )
          })}
        </View>

        {/* 第五行 按钮 */}
        <Button className='search-btn' onClick={handleSearch}>
          查询
        </Button>
      </View>


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

      {/* 星级弹层 */}
      {showStarSelect && (
        <View
          className='mask'
          onClick={() => setShowStarSelect(false)}>
          <View
            className='popup star-popup'
            onClick={(e) => e.stopPropagation()} >
            <View className='popup-header'>
              <Text className='popup-title'>选择星级</Text>
            </View>

            <View className='star-grid'>
             {starOptions.map((item, index) => {
                const active = item === '不限'
                    ? stars.length === 0
                    : stars.includes(item)

                return (
                  <View
                    key={index}
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

                      if (active) {
                        setStars(stars.filter(s => s !== item))
                      } else {
                        setStars([...stars, item])
                      }
                    }}>
                    {item}
                  </View>
                )
              })}
            </View>
            <View className='star-footer'>
              <Button
                className='star-confirm-btn'
                onClick={() => setShowStarSelect(false)} >
                确定
              </Button>
            </View>
          </View>
        </View>
      )}

    </View>
  )
}

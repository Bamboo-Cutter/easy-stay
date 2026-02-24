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

<<<<<<< Updated upstream
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
=======
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
    // Taro.getLocation({
    //   type: 'gcj02',
    //   success: () => setCity('上海'),
    //   fail: () => setCity('上海')
    // })
    try {
      // 尝试系统定位
      handleGetLocationByIP();
    } catch (err) {
      setCity('上海')
    }
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
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

  const handleGetLocationByIP = async () => {
    try {
      Taro.showLoading({ title: '定位中...' });
      // 1. 配置你的腾讯地图 Key
      const QQ_MAP_KEY = 'BHWBZ-5226A-JOHKN-CJ364-AUDUQ-NUBCZ'; 
      // 2. 调用腾讯地图 IP 定位接口
      const res = await Taro.request({
        url: 'https://apis.map.qq.com/ws/location/v1/ip',
        data: {
          key: QQ_MAP_KEY
        },
        method: 'GET'
      });
      // 3. 解析返回结果
      if (res.data.status === 0) {
        const city = res.data.result.ad_info.city; // 获取城市名，如 "上海市"
        console.log('IP 定位成功：', city);
        // 更新你的状态
        setCity(city);
        Taro.showToast({ title: `当前城市：${city}`, icon: 'none' });
      } else {
        // 如果报错（比如额度上限），抛出错误
        throw new Error(res.data.message);
      }
    } catch (err) {
      console.error('IP定位失败：', err);
      // 容错处理：如果 Key 还是报错，可以给个手动选择的提示
      setCity('上海');
      Taro.showToast({ title: '定位失败，请手动选择', icon: 'none' });
    } finally {
      Taro.hideLoading();
    }
  };


>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
          className='banner-img'
          src='https://picsum.photos/800/300'
          mode='aspectFill'/>
        <View className='banner-mask'>
          <Text className='banner-text'>酒店7折起</Text>
=======
          className='hero-img'
          src='https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'
          mode='aspectFill'
        />
        <View className='hero-overlay'>
          <View className='hero-top'>
            <Text className='hero-badge'>Easy Stay</Text>
            <Text className='hero-chip'>{city === '定位中...' ? '定位中' : `${city} 热门`}</Text>
          </View>
          <View className='hero-sub'>
            <Text className='hero-title'>酒店与住宿</Text>
            {/* <Text className='hero-sub'>中文城市数据已接通，支持筛选与附近点位排序</Text> */}
          </View>
>>>>>>> Stashed changes
        </View>
      </View>

      {/* ================= 查询卡片 ================= */}
      <View className='search-card'>
<<<<<<< Updated upstream
        {/* 第一行 */}
        <View className='row'>
          <View
            className='location'
            onClick={() => setShowCityPicker(true)}
          >
            <Text className='city'>{city}</Text>
          </View>
=======
        <View className='search-header'>
          <View className='search-subtitle'>
            <View className='search-local' onClick={handleGetLocationByIP}>定位</View>
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
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
=======
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
          {/* <Text className='section-label'>热门搜索示例（点击填充）</Text> */}
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
          <Text className='panel-title'>热门城市</Text>
        </View>
        <View className='dest-row'>
          {[
            { city: '上海', sub: '外滩 / 陆家嘴', cls: 'dest-card-1', keyword: '外滩' },
            { city: '成都', sub: '春熙路 / 太古里', cls: 'dest-card-2', keyword: '春熙路' },
            { city: '杭州', sub: '西湖 / 龙翔桥', cls: 'dest-card-3', keyword: '西湖' }
          ].map((item) => (
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
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
>>>>>>> Stashed changes


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

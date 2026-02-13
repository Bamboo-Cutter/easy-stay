import { useEffect, useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Picker, Text, View } from '@tarojs/components';
import { api } from '../../services/api';
import { afterDays, toIsoDay } from '../../utils/date';
import './index.scss';

const HISTORY_KEY = 'easy_stay_mobile_search_history';

function loadHistory() {
  try {
    return JSON.parse(Taro.getStorageSync(HISTORY_KEY) || '[]') as string[];
  } catch {
    return [];
  }
}

function saveHistory(keyword: string) {
  const h = loadHistory().filter((x) => x !== keyword);
  h.unshift(keyword);
  Taro.setStorageSync(HISTORY_KEY, JSON.stringify(h.slice(0, 8)));
}

function addDays(isoDate: string, offset: number) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + offset);
  return toIsoDay(d).slice(0, 10);
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; city: string; label: string }>>([]);
  const [checkIn, setCheckIn] = useState(toIsoDay(afterDays(1)).slice(0, 10));
  const [checkOut, setCheckOut] = useState(toIsoDay(afterDays(2)).slice(0, 10));
  const [roomsCount, setRoomsCount] = useState('1');

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    if (!keyword.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      api
        .getSuggestions(keyword)
        .then((res) => setSuggestions(res.items || []))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [keyword]);

  const quickDate = useMemo(() => ({ checkIn: toIsoDay(checkIn), checkOut: toIsoDay(checkOut) }), [checkIn, checkOut]);

  const goList = (text: string, cityHint?: string) => {
    const kw = text.trim();
    if (!kw) {
      Taro.showToast({ title: '请输入目的地', icon: 'none' });
      return;
    }

    if (new Date(quickDate.checkOut) <= new Date(quickDate.checkIn)) {
      Taro.showToast({ title: '离店日期必须晚于入住', icon: 'none' });
      return;
    }

    const rooms = Math.max(1, Number(roomsCount || 1));
    saveHistory(kw);
    setHistory(loadHistory());

    const city = cityHint || kw;
    Taro.navigateTo({
      url: `/pages/hotel-list/index?city=${encodeURIComponent(city)}&keyword=${encodeURIComponent(kw)}&check_in=${encodeURIComponent(quickDate.checkIn)}&check_out=${encodeURIComponent(quickDate.checkOut)}&rooms_count=${rooms}&page=1&limit=20&sort=recommended`,
    });
  };

  return (
    <View className='search-page'>
      <View className='search-top'>
        <View className='back' onClick={() => Taro.navigateBack()}>
          ←
        </View>
        <View className='search-input'>
          <Text>🤖</Text>
          <Input value={keyword} placeholder='目的地、景点、酒店等' onInput={(e) => setKeyword(e.detail.value)} />
        </View>
        <View className='search-btn' onClick={() => goList(keyword)}>
          搜寻
        </View>
      </View>

      <View className='panel'>
        <View className='panel-h'>
          <Text>搜索设置</Text>
        </View>
        <View className='config-grid'>
          <View>
            <View className='muted config-label'>入住</View>
            <Picker mode='date' value={checkIn} onChange={(e) => setCheckIn(e.detail.value)}>
              <View className='cfg-input'>{checkIn}</View>
            </Picker>
          </View>
          <View>
            <View className='muted config-label'>离店</View>
            <Picker mode='date' value={checkOut} onChange={(e) => setCheckOut(e.detail.value)}>
              <View className='cfg-input'>{checkOut}</View>
            </Picker>
          </View>
        </View>
        <View className='quick-date-row'>
          <View className='q-btn' onClick={() => { const inDate = toIsoDay(afterDays(1)).slice(0, 10); setCheckIn(inDate); setCheckOut(addDays(inDate, 1)); }}>明天1晚</View>
          <View className='q-btn' onClick={() => { const inDate = toIsoDay(afterDays(3)).slice(0, 10); setCheckIn(inDate); setCheckOut(addDays(inDate, 2)); }}>3天后2晚</View>
          <View className='q-btn' onClick={() => setRoomsCount(String(Math.min(5, Number(roomsCount) + 1)))}>房间+1</View>
          <View className='q-btn' onClick={() => setRoomsCount(String(Math.max(1, Number(roomsCount) - 1)))}>房间-1</View>
        </View>
        <View className='muted' style='padding:0 12px 12px'>房间数量：{roomsCount}</View>
      </View>

      <View className='panel'>
        <View className='panel-h'>
          <Text>最近搜索记录</Text>
          <Text
            style='color:#2f55e7'
            onClick={() => {
              Taro.removeStorageSync(HISTORY_KEY);
              setHistory([]);
            }}
          >
            清除
          </Text>
        </View>
        <View className='chips'>
          {history.length ? (
            history.map((h) => (
              <View key={h} className='chip' onClick={() => goList(h)}>
                {h}
              </View>
            ))
          ) : (
            <Text className='muted'>暂无历史记录</Text>
          )}
        </View>
      </View>

      <View className='panel'>
        <View className='panel-h'>
          <Text>智能搜索建议</Text>
        </View>
        {(suggestions || []).map((s) => (
          <View key={s.id} className='suggestion-item' onClick={() => goList(s.label, s.city)}>
            <View style='font-size:28px;font-weight:600'>{s.label}</View>
            <View className='muted'>{s.city}</View>
          </View>
        ))}
        {!suggestions.length && <View className='suggestion-item muted'>输入关键词后显示建议</View>}
      </View>

      <View className='panel'>
        <View className='panel-h'>
          <Text>TripGenie 提示</Text>
        </View>
        <View className='suggestion-item'>你好，我系 TripGenie。试吓用智慧搜寻，获取旅游灵感！</View>
      </View>
    </View>
  );
}

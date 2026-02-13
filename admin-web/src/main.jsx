//导入react DOM库
import ReactDOM from 'react-dom/client'
//引入重置样式
import './assets/reset.css'
//引入根组件
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider><App /></AuthProvider>
  
)

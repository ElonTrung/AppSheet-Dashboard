import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, ShoppingCart, Users, Settings, Bell, 
  DollarSign, TrendingUp, Package, Activity, FileText, FileDown, FileCheck, UserPlus, Filter
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
import { fetchAppSheetData } from './services/appsheet';
import { getMisaAccessToken, fetchMisaPurchaseData } from './services/misa';

const getSum = (arr) => arr.reduce((acc, curr) => {
  const val = curr['Tong_tien_da_ co_VAT'] || curr.Tong_tien_da_co_VAT || curr.Tong_tien_mua_hang_co_VAT || curr.total || curr.Total || curr['Tổng tiền'] || curr['Thành tiền'] || curr.Price || 0;
  return acc + Number(val);
}, 0);

const parseAppSheetDate = (dateStr) => {
  if (!dateStr) return null;
  let cleanStr = String(dateStr).split(' ')[0];
  if (cleanStr.includes('/')) {
     const parts = cleanStr.split('/');
     if (parts.length === 3) {
        let p1 = Number(parts[0]);
        let p2 = Number(parts[1]);
        let year = parts[2];
        let month = p1;
        let day = p2;
        if (p1 > 12) { month = p2; day = p1; }
        return new Date(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T00:00:00`);
     }
  }
  return new Date(cleanStr);
};

const isDateToday = (dateStr) => {
   if (!dateStr) return false;
   const d = parseAppSheetDate(dateStr);
   if (!d || isNaN(d)) return false;
   const today = new Date();
   return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
};

const getCustomerName = (row) => row.Ten_khach_hang || row.Ten_NCC || row.khachhang || row.Khachhang || row['Khách hàng'] || row.supplier || row['Nhà cung cấp'] || row.Supplier || "Unknown";
const getRowDateStr = (row) => row.Ngay_bao_gia || row.Ngay_ban_hang || row.Ngay_mua_hang || row.date || row.Date || row['Ngày tạo'] || row['Ngày'];
const getSaleValue = (row) => Number(row['Tong_tien_da_ co_VAT'] || row.Tong_tien_da_co_VAT || row.Tong_tien_mua_hang_co_VAT || row.total || row.Total || row['Tổng tiền'] || row['Thành tiền'] || row.Price || 0);

function App() {
  const [dataBG, setDataBG] = useState([]);
  const [dataDH, setDataDH] = useState([]);
  const [dataMH, setDataMH] = useState([]);
  const [dataNCC, setDataNCC] = useState([]);
  const [loading, setLoading] = useState(true);

  const getTodayString = () => {
     const d = new Date();
     const m = String(d.getMonth() + 1).padStart(2, '0');
     const day = String(d.getDate()).padStart(2, '0');
     return `${d.getFullYear()}-${m}-${day}`;
  };

  const getLastWeekString = () => {
     const d = new Date();
     d.setDate(d.getDate() - 6);
     const m = String(d.getMonth() + 1).padStart(2, '0');
     const day = String(d.getDate()).padStart(2, '0');
     return `${d.getFullYear()}-${m}-${day}`;
  };

  const [startDate, setStartDate] = useState(getLastWeekString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [ncStartDate, setNcStartDate] = useState(getLastWeekString());
  const [ncEndDate, setNcEndDate] = useState(getTodayString());
  const [bgStartDate, setBgStartDate] = useState(getLastWeekString());
  const [bgEndDate, setBgEndDate] = useState(getTodayString());
  const [crateStartDate, setCrateStartDate] = useState(getLastWeekString());
  const [crateEndDate, setCrateEndDate] = useState(getTodayString());
  const [nbStartDate, setNbStartDate] = useState(getLastWeekString());
  const [nbEndDate, setNbEndDate] = useState(getTodayString());
  const [crStartDate, setCrStartDate] = useState(getLastWeekString());
  const [crEndDate, setCrEndDate] = useState(getTodayString());
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [prStartDate, setPrStartDate] = useState(getLastWeekString());
  const [prEndDate, setPrEndDate] = useState(getTodayString());
  const [todayOrderDate, setTodayOrderDate] = useState(getTodayString());
  const [dataCTDH, setDataCTDH] = useState([]);
  const [dataCTBG, setDataCTBG] = useState([]);
  const [dataDGC, setDataDGC] = useState([]);
  const [dataVC, setDataVC] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const [profitPage, setProfitPage] = useState(1);
  const [misaPage, setMisaPage] = useState(1);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState(null);
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const itemsPerPage = 50;

  useEffect(() => { setProfitPage(1); }, [startDate, endDate]);

  const [misaPurchaseData, setMisaPurchaseData] = useState([]);
  const [loadingMisaPurchase, setLoadingMisaPurchase] = useState(false);
  const [misaError, setMisaError] = useState(null);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      const [bg, dh, mh, ncc, ctdh, dgc, vc, ctbg] = await Promise.all([
        fetchAppSheetData("baogia"),
        fetchAppSheetData("donhang"),
        fetchAppSheetData("muahang"),
        fetchAppSheetData("ncc"),
        fetchAppSheetData("chitietdonhang"),
        fetchAppSheetData("denghichi"),
        fetchAppSheetData("vanchuyen"),
        fetchAppSheetData("chitietbaogia")
      ]);
      setDataBG(bg);
      setDataDH(dh);
      setDataMH(mh);
      setDataNCC(ncc);
      setDataCTDH(ctdh);
      setDataDGC(dgc);
      setDataVC(vc);
      setDataCTBG(ctbg);
      setLoading(false);
    };
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'misa' && misaPurchaseData.length === 0) {
      const loadMisaData = async () => {
        setLoadingMisaPurchase(true);
        setMisaError(null);
        try {
           const token = await getMisaAccessToken();
           const data = await fetchMisaPurchaseData(token);
           setMisaPurchaseData(data);
        } catch (err) {
           setMisaError(err.message || 'Lỗi kết nối MISA');
        } finally {
           setLoadingMisaPurchase(false);
        }
      };
      loadMisaData();
    }
  }, [activeTab, misaPurchaseData.length]);

  const { filteredBG, filteredDH, filteredMH, totalBG, totalDH, totalMH } = useMemo(() => {
     const filterByDate = (arr) => {
        if (!startDate && !endDate) return arr;
        const start = startDate ? new Date(startDate).setHours(0,0,0,0) : 0;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
        return arr.filter(row => {
           const d = parseAppSheetDate(getRowDateStr(row));
           if(!d || isNaN(d.getTime())) return false;
           return d.getTime() >= start && d.getTime() <= end;
        });
     };
     const fBG = filterByDate(dataBG);
     const fDH = filterByDate(dataDH);
     const fMH = filterByDate(dataMH);

     return {
        filteredBG: fBG, filteredDH: fDH, filteredMH: fMH,
        totalBG: getSum(fBG), totalDH: getSum(fDH), totalMH: getSum(fMH)
     };
  }, [dataBG, dataDH, dataMH, startDate, endDate]);

  const { comparisonChartData, comparisonName, compareMode, sumCurrentDH, sumPreviousDH } = useMemo(() => {
      const mergeDate = (arr, outputMap, key) => {
        arr.forEach(curr => {
          const dateStr = getRowDateStr(curr);
          const date = dateStr ? parseAppSheetDate(dateStr) : null;
          const kDate = (date && !isNaN(date)) ? `${String(date.getMonth() + 1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')}/${date.getFullYear()}` : "Unknown";
          const val = getSaleValue(curr);
          if (!outputMap[kDate]) outputMap[kDate] = { name: kDate, dh: 0, mh: 0 };
          outputMap[kDate][key] += Number(val);
        });
      };

      const chartMap = {};
      mergeDate(filteredDH, chartMap, 'dh');
      mergeDate(filteredMH, chartMap, 'mh');
      
      const cData = Object.values(chartMap).sort((a,b) => {
         const da = parseAppSheetDate(a.name);
         const db = parseAppSheetDate(b.name);
         if (da && db && !isNaN(da) && !isNaN(db)) return da.getTime() - db.getTime();
         return a.name.localeCompare(b.name);
      });

      const allDHMap = {};
      dataDH.forEach(curr => {
          const val = getSaleValue(curr);
          const d = parseAppSheetDate(getRowDateStr(curr));
          if (d && !isNaN(d)) {
             const dKey = d.toISOString().split('T')[0];
             if (!allDHMap[dKey]) allDHMap[dKey] = 0;
             allDHMap[dKey] += Number(val);
          }
      });

       let cMode = 'month'; 
       let cName = "Cùng Kỳ Tháng Trước";

       if (startDate && endDate) {
           const start = new Date(startDate);
           const end = new Date(endDate);
           const diffTime = Math.abs(end - start);
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
           if (diffDays <= 14) {
               cMode = 'week';
               cName = "Cùng Kỳ Tuần Trước";
           }
       } else if (startDate && !endDate) {
           const start = new Date(startDate);
           const today = new Date();
           const diffTime = Math.abs(today - start);
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
           if (diffDays <= 14) {
               cMode = 'week';
               cName = "Cùng Kỳ Tuần Trước";
           }
       }

      const compChartData = cData.map(item => {
         let previousDH = 0;
         let previousName = "";
         const d = parseAppSheetDate(item.name);
         if (d && !isNaN(d)) {
            const prevDate = new Date(d);
            if (cMode === 'week') {
                prevDate.setDate(prevDate.getDate() - 7);
            } else {
                prevDate.setMonth(prevDate.getMonth() - 1);
            }
            const pKey = prevDate.toISOString().split('T')[0];
            previousDH = allDHMap[pKey] || 0;
            const pd_m = String(prevDate.getMonth() + 1).padStart(2, '0');
            const pd_d = String(prevDate.getDate()).padStart(2, '0');
            previousName = `${pd_m}/${pd_d}/${prevDate.getFullYear()}`;
         }
         return { ...item, previousDH, previousName };
      });

      const sCurrDH = compChartData.reduce((acc, item) => acc + (item.dh || 0), 0);
      const sPrevDH = compChartData.reduce((acc, item) => acc + (item.previousDH || 0), 0);

      return {
         comparisonChartData: compChartData,
         comparisonName: cName,
         compareMode: cMode,
         sumCurrentDH: sCurrDH,
         sumPreviousDH: sPrevDH
      };
  }, [filteredDH, filteredMH, dataDH, startDate, endDate]);

  const legendCurrentDH = `Doanh Thu Hiện Tại (${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(sumCurrentDH)})`;
  const legendPreviousDH = `${comparisonName} (${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(sumPreviousDH)})`;

  const { ncComparisonChartData, ncComparisonName, ncCompareMode } = useMemo(() => {
      const allNewCustomers = dataBG.filter(row => {
        const soBaoGia = String(row.So_bao_gia || row.id || row.ID || "");
        return (soBaoGia.startsWith("001/") || soBaoGia.startsWith("001-"));
      });

      const allNCMap = {};
      allNewCustomers.forEach(curr => {
          const d = parseAppSheetDate(getRowDateStr(curr));
          if (d && !isNaN(d)) {
             const dKey = d.toISOString().split('T')[0];
             if (!allNCMap[dKey]) allNCMap[dKey] = 0;
             allNCMap[dKey] += 1;
          }
      });

      const filteredNewCustomers = allNewCustomers.filter(row => {
        const d = parseAppSheetDate(getRowDateStr(row));
        if (!d || isNaN(d)) return false;
        const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const start = ncStartDate ? new Date(ncStartDate) : null;
        const end = ncEndDate ? new Date(ncEndDate) : null;
        if (start) start.setHours(0,0,0,0);
        if (end) end.setHours(23,59,59,999);
        if (start && end) return itemDate >= start && itemDate <= end;
        if (start) return itemDate >= start;
        if (end) return itemDate <= end;
        return true;
      });

      const ncChartMap = {};
      filteredNewCustomers.forEach(curr => {
          const d = parseAppSheetDate(getRowDateStr(curr));
          if (d && !isNaN(d)) {
             const dstr = String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + '/' + d.getFullYear();
             if (!ncChartMap[dstr]) ncChartMap[dstr] = { name: dstr, nc: 0 };
             ncChartMap[dstr].nc += 1;
          }
      });
      
      const ncChartData = Object.values(ncChartMap).sort((a,b) => {
         const da = parseAppSheetDate(a.name);
         const db = parseAppSheetDate(b.name);
         if (da && db && !isNaN(da) && !isNaN(db)) return da.getTime() - db.getTime();
         return a.name.localeCompare(b.name);
      });

      let ncCMode = 'month';
      let ncCName = "Cùng Kỳ Tháng Trước";
      if (ncStartDate && ncEndDate) {
          const start = new Date(ncStartDate);
          const end = new Date(ncEndDate);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          if (diffDays <= 14) {
              ncCMode = 'week';
              ncCName = "Cùng Kỳ Tuần Trước";
          }
      } else if (ncStartDate && !ncEndDate) {
          const start = new Date(ncStartDate);
          const today = new Date();
          const diffTime = Math.abs(today - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          if (diffDays <= 14) {
              ncCMode = 'week';
              ncCName = "Cùng Kỳ Tuần Trước";
          }
      }

      const ncCompChartData = ncChartData.map(item => {
         let previousNC = 0;
         let previousName = "";
         const d = parseAppSheetDate(item.name);
         if (d && !isNaN(d)) {
            const prevDate = new Date(d);
            if (ncCMode === 'week') {
                prevDate.setDate(prevDate.getDate() - 7);
            } else {
                prevDate.setMonth(prevDate.getMonth() - 1);
            }
            const pKey = prevDate.toISOString().split('T')[0];
            previousNC = allNCMap[pKey] || 0;
            const pd_m = String(prevDate.getMonth() + 1).padStart(2, '0');
            const pd_d = String(prevDate.getDate()).padStart(2, '0');
            previousName = `${pd_m}/${pd_d}/${prevDate.getFullYear()}`;
         }
         return { ...item, previousNC, previousName };
      });

      return {
         ncComparisonChartData: ncCompChartData,
         ncComparisonName: ncCName,
         ncCompareMode: ncCMode
      };
  }, [dataBG, ncStartDate, ncEndDate]);

  const { bgComparisonChartData, bgComparisonName, bgCompareMode, quotesInPeriod } = useMemo(() => {
      const allQuotes = dataBG;

      const allBGMap = {};
      allQuotes.forEach(curr => {
          const d = parseAppSheetDate(getRowDateStr(curr));
          if (d && !isNaN(d)) {
             const dKey = d.toISOString().split('T')[0];
             if (!allBGMap[dKey]) allBGMap[dKey] = 0;
             allBGMap[dKey] += 1;
          }
      });

      const filteredQuotes = allQuotes.filter(row => {
        const d = parseAppSheetDate(getRowDateStr(row));
        if (!d || isNaN(d)) return false;
        const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const start = bgStartDate ? new Date(bgStartDate) : null;
        const end = bgEndDate ? new Date(bgEndDate) : null;
        if (start) start.setHours(0,0,0,0);
        if (end) end.setHours(23,59,59,999);
        if (start && end) return itemDate >= start && itemDate <= end;
        if (start) return itemDate >= start;
        if (end) return itemDate <= end;
        return true;
      });

      const bgChartMap = {};
      filteredQuotes.forEach(curr => {
          const d = parseAppSheetDate(getRowDateStr(curr));
          if (d && !isNaN(d)) {
             const dstr = String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + '/' + d.getFullYear();
             if (!bgChartMap[dstr]) bgChartMap[dstr] = { name: dstr, bg: 0 };
             bgChartMap[dstr].bg += 1;
          }
      });
      
      const bgChartData = Object.values(bgChartMap).sort((a,b) => {
         const da = parseAppSheetDate(a.name);
         const db = parseAppSheetDate(b.name);
         if (da && db && !isNaN(da) && !isNaN(db)) return da.getTime() - db.getTime();
         return a.name.localeCompare(b.name);
      });

      let bgCMode = 'month';
      let bgCName = "Cùng Kỳ Tháng Trước";
      if (bgStartDate && bgEndDate) {
          const start = new Date(bgStartDate);
          const end = new Date(bgEndDate);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          if (diffDays <= 14) {
              bgCMode = 'week';
              bgCName = "Cùng Kỳ Tuần Trước";
          }
      } else if (bgStartDate && !bgEndDate) {
          const start = new Date(bgStartDate);
          const today = new Date();
          const diffTime = Math.abs(today - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          if (diffDays <= 14) {
              bgCMode = 'week';
              bgCName = "Cùng Kỳ Tuần Trước";
          }
      }

      const bgCompChartData = bgChartData.map(item => {
         let previousBG = 0;
         let previousName = "";
         const d = parseAppSheetDate(item.name);
         if (d && !isNaN(d)) {
            const prevDate = new Date(d);
            if (bgCMode === 'week') {
                prevDate.setDate(prevDate.getDate() - 7);
            } else {
                prevDate.setMonth(prevDate.getMonth() - 1);
            }
            const pKey = prevDate.toISOString().split('T')[0];
            previousBG = allBGMap[pKey] || 0;
            const pd_m = String(prevDate.getMonth() + 1).padStart(2, '0');
            const pd_d = String(prevDate.getDate()).padStart(2, '0');
            previousName = `${pd_m}/${pd_d}/${prevDate.getFullYear()}`;
         }
         return { ...item, previousBG, previousName };
      });

      return {
         bgComparisonChartData: bgCompChartData,
         bgComparisonName: bgCName,
         bgCompareMode: bgCMode,
         quotesInPeriod: filteredQuotes.length
      };
  }, [dataBG, bgStartDate, bgEndDate]);

  const { crateComparisonChartData, crateComparisonName, crateCompareMode, currentCrate } = useMemo(() => {
      const allBGMap = {};
      dataBG.forEach(curr => {
          const d = parseAppSheetDate(getRowDateStr(curr));
          if (d && !isNaN(d)) {
             const dKey = d.toISOString().split('T')[0];
             if (!allBGMap[dKey]) allBGMap[dKey] = 0;
             allBGMap[dKey] += 1;
          }
      });

      const allDHMap = {};
      dataDH.forEach(curr => {
          const d = parseAppSheetDate(getRowDateStr(curr));
          if (d && !isNaN(d)) {
             const dKey = d.toISOString().split('T')[0];
             if (!allDHMap[dKey]) allDHMap[dKey] = 0;
             allDHMap[dKey] += 1;
          }
      });
      
      const start = crateStartDate ? new Date(crateStartDate) : null;
      const end = crateEndDate ? new Date(crateEndDate) : null;
      if (start) start.setHours(0,0,0,0);
      if (end) end.setHours(23,59,59,999);

      const currentDates = new Set();
      dataBG.concat(dataDH).forEach(curr => {
         const d = parseAppSheetDate(getRowDateStr(curr));
         if (d && !isNaN(d)) {
            const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            let inRange = true;
            if (start && end) inRange = itemDate >= start && itemDate <= end;
            else if (start) inRange = itemDate >= start;
            else if (end) inRange = itemDate <= end;

            if (inRange) {
               const dstr = String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + '/' + d.getFullYear();
               currentDates.add(dstr);
            }
         }
      });

      const crateChartData = Array.from(currentDates).sort((a,b) => {
         const da = parseAppSheetDate(a);
         const db = parseAppSheetDate(b);
         if (da && db && !isNaN(da) && !isNaN(db)) return da.getTime() - db.getTime();
         return a.localeCompare(b);
      }).map(dstr => {
         const d = parseAppSheetDate(dstr);
         const dKey = d ? d.toISOString().split('T')[0] : "";
         const bg = allBGMap[dKey] || 0;
         const dh = allDHMap[dKey] || 0;
         const rate = bg > 0 ? (dh / bg) * 100 : (dh > 0 ? 100 : 0);
         return { name: dstr, rate: Number(rate.toFixed(1)) };
      });

      let cMode = 'month';
      let cName = "Cùng Kỳ Tháng Trước";
      if (crateStartDate && crateEndDate) {
          const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)); 
          if (diffDays <= 14) { cMode = 'week'; cName = "Cùng Kỳ Tuần Trước"; }
      }

      const compChartData = crateChartData.map(item => {
         let previousRate = 0;
         let previousName = "";
         const d = parseAppSheetDate(item.name);
         if (d && !isNaN(d)) {
            const prevDate = new Date(d);
            if (cMode === 'week') prevDate.setDate(prevDate.getDate() - 7);
            else prevDate.setMonth(prevDate.getMonth() - 1);
            
            const pKey = prevDate.toISOString().split('T')[0];
            const pBg = allBGMap[pKey] || 0;
            const pDh = allDHMap[pKey] || 0;
            previousRate = pBg > 0 ? (pDh / pBg) * 100 : (pDh > 0 ? 100 : 0);
            previousRate = Number(previousRate.toFixed(1));

            previousName = `${String(prevDate.getMonth() + 1).padStart(2, '0')}/${String(prevDate.getDate()).padStart(2, '0')}/${prevDate.getFullYear()}`;
         }
         return { ...item, previousRate, previousName };
      });

      let totalBgCurrent = 0;
      let totalDhCurrent = 0;
      dataBG.forEach(curr => {
         const d = parseAppSheetDate(getRowDateStr(curr));
         if (d && !isNaN(d)) {
            const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            let inRange = true;
            if (start && end) inRange = itemDate >= start && itemDate <= end;
            else if (start) inRange = itemDate >= start;
            else if (end) inRange = itemDate <= end;
            if (inRange) totalBgCurrent++;
         }
      });
      dataDH.forEach(curr => {
         const d = parseAppSheetDate(getRowDateStr(curr));
         if (d && !isNaN(d)) {
            const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            let inRange = true;
            if (start && end) inRange = itemDate >= start && itemDate <= end;
            else if (start) inRange = itemDate >= start;
            else if (end) inRange = itemDate <= end;
            if (inRange) totalDhCurrent++;
         }
      });
      const cRate = totalBgCurrent > 0 ? ((totalDhCurrent / totalBgCurrent) * 100).toFixed(1) : (totalDhCurrent > 0 ? 100 : 0);

      return {
         crateComparisonChartData: compChartData,
         crateComparisonName: cName,
         crateCompareMode: cMode,
         currentCrate: cRate
      };
  }, [dataBG, dataDH, crateStartDate, crateEndDate]);

  const { nbComparisonChartData, nbComparisonName, nbCompareMode } = useMemo(() => {
      const customerFirstOrderMap = {};
      dataDH.forEach(row => {
         const name = String(getCustomerName(row)).trim();
         const d = parseAppSheetDate(getRowDateStr(row));
         if (d && !isNaN(d)) {
            if (!customerFirstOrderMap[name] || d < customerFirstOrderMap[name].date) {
               customerFirstOrderMap[name] = { date: d };
            }
         }
      });

      const allNBMap = {};
      Object.values(customerFirstOrderMap).forEach(info => {
         const dKey = info.date.toISOString().split('T')[0];
         if (!allNBMap[dKey]) allNBMap[dKey] = 0;
         allNBMap[dKey] += 1;
      });

      const filteredNewBuyers = Object.values(customerFirstOrderMap).filter(info => {
        const itemDate = new Date(info.date.getFullYear(), info.date.getMonth(), info.date.getDate());
        const start = nbStartDate ? new Date(nbStartDate) : null;
        const end = nbEndDate ? new Date(nbEndDate) : null;
        if (start) start.setHours(0,0,0,0);
        if (end) end.setHours(23,59,59,999);
        if (start && end) return itemDate >= start && itemDate <= end;
        if (start) return itemDate >= start;
        if (end) return itemDate <= end;
        return true;
      });

      const nbChartMap = {};
      filteredNewBuyers.forEach(info => {
          const dstr = String(info.date.getMonth() + 1).padStart(2, '0') + '/' + String(info.date.getDate()).padStart(2, '0') + '/' + info.date.getFullYear();
          if (!nbChartMap[dstr]) nbChartMap[dstr] = { name: dstr, nb: 0 };
          nbChartMap[dstr].nb += 1;
      });
      
      const nbChartData = Object.values(nbChartMap).sort((a,b) => {
         const da = parseAppSheetDate(a.name);
         const db = parseAppSheetDate(b.name);
         if (da && db && !isNaN(da) && !isNaN(db)) return da.getTime() - db.getTime();
         return a.name.localeCompare(b.name);
      });

      let nbCMode = 'month';
      let nbCName = "Cùng Kỳ Tháng Trước";
      if (nbStartDate && nbEndDate) {
          const start = new Date(nbStartDate);
          const end = new Date(nbEndDate);
          const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)); 
          if (diffDays <= 14) { nbCMode = 'week'; nbCName = "Cùng Kỳ Tuần Trước"; }
      } else if (nbStartDate && !nbEndDate) {
          const diffDays = Math.ceil(Math.abs(new Date() - new Date(nbStartDate)) / (1000 * 60 * 60 * 24)); 
          if (diffDays <= 14) { nbCMode = 'week'; nbCName = "Cùng Kỳ Tuần Trước"; }
      }

      const nbCompChartData = nbChartData.map(item => {
         let previousNB = 0;
         let previousName = "";
         const d = parseAppSheetDate(item.name);
         if (d && !isNaN(d)) {
            const prevDate = new Date(d);
            if (nbCMode === 'week') prevDate.setDate(prevDate.getDate() - 7);
            else prevDate.setMonth(prevDate.getMonth() - 1);
            
            const pKey = prevDate.toISOString().split('T')[0];
            previousNB = allNBMap[pKey] || 0;
            previousName = `${String(prevDate.getMonth() + 1).padStart(2, '0')}/${String(prevDate.getDate()).padStart(2, '0')}/${prevDate.getFullYear()}`;
         }
         return { ...item, previousNB, previousName };
      });

      return {
         nbComparisonChartData: nbCompChartData,
         nbComparisonName: nbCName,
         nbCompareMode: nbCMode
      };
  }, [dataDH, nbStartDate, nbEndDate]);

  const { 
     newBuyersToday, newBuyersOrderIds, newCustomersToday, 
     uniqueCustomers, selectedCustomerStats,
     topCustomers, topSuppliers, recentActivities, finalTopProducts
  } = useMemo(() => {
      const customerFirstOrderMap = {};
      dataDH.forEach(row => {
         const name = String(getCustomerName(row)).trim();
         const d = parseAppSheetDate(getRowDateStr(row));
         const so_don_hang = String(row.So_don_hang || row.So_bao_gia || row.So_mua_hang || row.id || row.ID || row.Id || "N/A").trim();
         if (d && !isNaN(d)) {
            if (!customerFirstOrderMap[name] || d < customerFirstOrderMap[name].date) {
               customerFirstOrderMap[name] = { date: d, orderId: so_don_hang };
            }
         }
      });

      const nbStart = nbStartDate ? new Date(nbStartDate) : null;
      if (nbStart) nbStart.setHours(0, 0, 0, 0);
      const nbEnd = nbEndDate ? new Date(nbEndDate) : null;
      if (nbEnd) nbEnd.setHours(23, 59, 59, 999);

      let nbToday = 0;
      const nbOrderIds = [];
      Object.values(customerFirstOrderMap).forEach(info => {
         if (nbStart && nbEnd && info.date.getTime() >= nbStart.getTime() && info.date.getTime() <= nbEnd.getTime()) {
             nbToday++;
             nbOrderIds.push(info.orderId);
         }
      });

      const ncStart = ncStartDate ? new Date(ncStartDate) : null;
      if (ncStart) ncStart.setHours(0, 0, 0, 0);
      const ncEnd = ncEndDate ? new Date(ncEndDate) : null;
      if (ncEnd) ncEnd.setHours(23, 59, 59, 999);

      const newCustsToday = dataBG.filter(row => {
        const soBaoGia = String(row.So_bao_gia || row.id || row.ID || "");
        if (!(soBaoGia.startsWith("001/") || soBaoGia.startsWith("001-"))) return false;
        const d = parseAppSheetDate(getRowDateStr(row));
        if (!d || isNaN(d)) return false;
        if (ncStart && ncEnd) return d.getTime() >= ncStart.getTime() && d.getTime() <= ncEnd.getTime();
        return false;
      }).length;

      const allCustomerNamesSet = new Set();
      dataBG.forEach(r => allCustomerNamesSet.add(String(getCustomerName(r)).trim()));
      dataDH.forEach(r => allCustomerNamesSet.add(String(getCustomerName(r)).trim()));
      const uCustomers = Array.from(allCustomerNamesSet).filter(n => n && n !== "Unknown").sort();

      const selectedCustomerStats = selectedCustomers.map(custName => {
          const quotes = dataBG.filter(r => {
             if (String(getCustomerName(r)).trim() !== custName) return false;
             if (!crStartDate && !crEndDate) return true;
             const d = parseAppSheetDate(getRowDateStr(r));
             if (!d || isNaN(d.getTime())) return false;
             const start = crStartDate ? new Date(crStartDate).setHours(0,0,0,0) : 0;
             const end = crEndDate ? new Date(crEndDate).setHours(23,59,59,999) : Infinity;
             return d.getTime() >= start && d.getTime() <= end;
          });
          const orders = dataDH.filter(r => {
             if (String(getCustomerName(r)).trim() !== custName) return false;
             if (!crStartDate && !crEndDate) return true;
             const d = parseAppSheetDate(getRowDateStr(r));
             if (!d || isNaN(d.getTime())) return false;
             const start = crStartDate ? new Date(crStartDate).setHours(0,0,0,0) : 0;
             const end = crEndDate ? new Date(crEndDate).setHours(23,59,59,999) : Infinity;
             return d.getTime() >= start && d.getTime() <= end;
          });
          const tBaoGiaCount = quotes.length;
          const tDonHangCount = orders.length;
          const sumDonHang = getSum(orders);
          const rate = tBaoGiaCount > 0 ? ((tDonHangCount / tBaoGiaCount) * 100).toFixed(1) : (tDonHangCount > 0 ? 100 : 0);
          return {
             name: custName,
             baoGiaCount: tBaoGiaCount,
             donHangCount: tDonHangCount,
             conversionRate: rate,
             doanhThu: sumDonHang
          };
      });
      
      const customerRevMap = {};
      dataDH.forEach(r => {
         const n = String(getCustomerName(r)).trim();
         if(n && n !== 'Unknown') customerRevMap[n] = (customerRevMap[n] || 0) + getSaleValue(r);
      });
      const tCustomers = Object.entries(customerRevMap).sort((a,b)=>b[1]-a[1]).slice(0,50);

      const suplierRevMap = {};
      dataMH.forEach(r => {
         const n = String(getCustomerName(r)).trim();
         if(n && n !== 'Unknown') suplierRevMap[n] = (suplierRevMap[n] || 0) + getSaleValue(r);
      });
      const tSuppliers = Object.entries(suplierRevMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

      const allActivities = [...dataBG.map(r=>({...r, actType: 'baogia'})), ...dataDH.map(r=>({...r, actType: 'donhang'}))].filter(r => parseAppSheetDate(getRowDateStr(r)));
      allActivities.sort((a,b) => parseAppSheetDate(getRowDateStr(b)).getTime() - parseAppSheetDate(getRowDateStr(a)).getTime());
      const rActivities = allActivities.slice(0, 5);

      const productCountMap = {};
      const productSalesMap = {};
      dataCTDH.forEach(row => {
         const proName = String(row.Ten_sanpham || row.ten_san_pham || row.TenSanPham || row.Ten_san_pham || row.SanPham || row.Product || row.Name || "").trim();
         if(proName && proName !== "Unknown" && proName !== "undefined" && proName !== "" && !proName.toLowerCase().includes("vận chuyển")) {
            if (!productCountMap[proName]) {
                productCountMap[proName] = 0;
                productSalesMap[proName] = 0;
            }
            productCountMap[proName] += 1;
            const qty = Number(row.So_luong || row.SoLuong || row.so_luong || row.Qty || row.Quantity || 0);
            productSalesMap[proName] += qty;
         }
      });

      const topProductsRaw = Object.entries(productCountMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
      const maxProductCount = topProductsRaw.length > 0 ? topProductsRaw[0][1] : 1; 

      const fTopProducts = topProductsRaw.map((p, index) => {
         const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#6366f1"];
         return {
            name: p[0],
            sold: p[1],
            volume: productSalesMap[p[0]],
            target: maxProductCount, 
            color: colors[index % colors.length]
         }
      });

      return {
         newBuyersToday: nbToday,
         newBuyersOrderIds: nbOrderIds,
         newCustomersToday: newCustsToday,
         uniqueCustomers: uCustomers,
         selectedCustomerStats: selectedCustomerStats,
         topCustomers: tCustomers,
         topSuppliers: tSuppliers,
         recentActivities: rActivities,
         finalTopProducts: fTopProducts
      };
  }, [dataBG, dataDH, dataMH, dataCTDH, selectedCustomers, crStartDate, crEndDate, ncStartDate, ncEndDate, nbStartDate, nbEndDate]);

  const { uniqueProducts, selectedProductStats } = useMemo(() => {
       const allProductNamesSet = new Set();
       dataCTDH.forEach(r => allProductNamesSet.add(String(r.Ten_sanpham || r.ten_san_pham || r.TenSanPham || r.Ten_san_pham || r.SanPham || r.Product || r.Name || "").trim()));
       dataCTBG.forEach(r => allProductNamesSet.add(String(r.Ten_sanpham || r.ten_san_pham || r.TenSanPham || r.Ten_san_pham || r.SanPham || r.Product || r.Name || "").trim()));
       const uProducts = Array.from(allProductNamesSet).filter(n => n && n !== "Unknown" && n !== "undefined" && !n.toLowerCase().includes("vận chuyển")).sort();

       const bgDateMap = {};
       dataBG.forEach(b => {
           const id = String(b.So_bao_gia || b.id || b.ID || "").trim();
           if(id) bgDateMap[id] = parseAppSheetDate(getRowDateStr(b));
       });
       const dhDateMap = {};
       dataDH.forEach(b => {
           const id = String(b.So_don_hang || b.So_bao_gia || b.So_mua_hang || b.id || b.ID || "").trim();
           if(id) dhDateMap[id] = parseAppSheetDate(getRowDateStr(b));
       });

       const stats = selectedProducts.map(prodName => {
           const filteredQ = dataCTBG.filter(r => {
               const p = String(r.Ten_sanpham || r.ten_san_pham || r.TenSanPham || r.Ten_san_pham || r.SanPham || r.Product || r.Name || "").trim();
               if(p !== prodName) return false;
               const id = String(r.So_bao_gia || r.ID_BaoGia || r.DH_Ref || r.don_hang_id || r.id).trim();
               const d = bgDateMap[id];
               if (!prStartDate && !prEndDate) return true;
               if (!d || isNaN(d.getTime())) return false;
               const start = prStartDate ? new Date(prStartDate).setHours(0,0,0,0) : 0;
               const end = prEndDate ? new Date(prEndDate).setHours(23,59,59,999) : Infinity;
               return d.getTime() >= start && d.getTime() <= end;
           });

           const filteredO = dataCTDH.filter(r => {
               const p = String(r.Ten_sanpham || r.ten_san_pham || r.TenSanPham || r.Ten_san_pham || r.SanPham || r.Product || r.Name || "").trim();
               if(p !== prodName) return false;
               const id = String(r.So_don_hang || r.So_bao_gia || r.DH_Ref || r.id).trim();
               const d = dhDateMap[id];
               if (!prStartDate && !prEndDate) return true;
               if (!d || isNaN(d.getTime())) return false;
               const start = prStartDate ? new Date(prStartDate).setHours(0,0,0,0) : 0;
               const end = prEndDate ? new Date(prEndDate).setHours(23,59,59,999) : Infinity;
               return d.getTime() >= start && d.getTime() <= end;
           });

           const uniqueQuotes = new Set(filteredQ.map(r => String(r.So_bao_gia || r.ID_BaoGia || r.DH_Ref || r.don_hang_id || r.id).trim()));
           const uniqueOrders = new Set(filteredO.map(r => String(r.So_don_hang || r.So_bao_gia || r.DH_Ref || r.id).trim()));

           const quotesCount = uniqueQuotes.size;
           const ordersCount = uniqueOrders.size;
           const rate = quotesCount > 0 ? ((ordersCount / quotesCount) * 100).toFixed(1) : (ordersCount > 0 ? 100 : 0);

           const qtyQ = filteredQ.reduce((acc, curr) => acc + Number(curr.So_luong || curr.SoLuong || curr.so_luong || curr.Qty || curr.Quantity || 0), 0);
           const qtyO = filteredO.reduce((acc, curr) => acc + Number(curr.So_luong || curr.SoLuong || curr.so_luong || curr.Qty || curr.Quantity || 0), 0);
           const qtyRate = qtyQ > 0 ? ((qtyO / qtyQ) * 100).toFixed(1) : (qtyO > 0 ? 100 : 0);

           return {
               name: prodName,
               baoGiaCount: quotesCount,
               donHangCount: ordersCount,
               conversionRate: rate,
               qtyBaoGia: qtyQ,
               qtyDonHang: qtyO,
               qtyConversionRate: qtyRate
           };
       });

       return { uniqueProducts: uProducts, selectedProductStats: stats };
  }, [dataBG, dataDH, dataCTBG, dataCTDH, selectedProducts, prStartDate, prEndDate]);

  const { filteredProfitData, totalProfitDoanhThu, totalProfitGiaVon, totalProfitCpKhac, totalProfitCpVC, totalProfitFinal } = useMemo(() => {
     const mhByOrder = {};
     const dgcByOrder = {};
     const vcByOrder = {};

     const orderIds = new Set();
     dataDH.forEach(r => {
        const id = String(r.So_don_hang || r.So_bao_gia || r.So_mua_hang || r.id || r.ID || r.Id || "N/A").trim();
        if (id !== "N/A") orderIds.add(id);
     });

     const populateMap = (sourceArr, targetMap) => {
        sourceArr.forEach(r => {
             let matchedId = null;
             const idKey = r.So_don_hang || r.So_bao_gia || r.So_mua_hang || r.DH_Ref || r.don_hang_id;
             if (idKey && orderIds.has(String(idKey).trim())) {
                 matchedId = String(idKey).trim();
             } else {
                 for (let v of Object.values(r)) {
                    const strV = String(v).trim();
                    if (orderIds.has(strV)) {
                        matchedId = strV;
                        break;
                    }
                 }
             }
             if (matchedId) {
                if (!targetMap[matchedId]) targetMap[matchedId] = [];
                targetMap[matchedId].push(r);
             }
        });
     };

     populateMap(dataMH, mhByOrder);
     populateMap(dataDGC, dgcByOrder);
     populateMap(dataVC, vcByOrder);

     const getValTruocThue = (r) => {
         const keys = ['Tong_tien_mua_vao_chua_VAT', 'Tong_tien_truoc_VAT', 'Truoc_thue', 'Truoc_VAT', 'Tổng tiền trước thuế', 'Trước thuế', 'Thành_tiền_trước_thuế', 'Thành tiền', 'Tong_tien', 'Tổng tiền', 'So_tien', 'Số tiền', 'total', 'Total'];
         for (let k of keys) {
             if (r[k] != null && String(r[k]).trim() !== "" && !isNaN(Number(r[k]))) return Number(r[k]);
         }
         return 0;
     };

     const getValTongTien = (r) => {
         const keys = ['Tong_tien', 'Tổng tiền', 'So_tien', 'Số tiền', 'Thành tiền', 'Thanh_tien', 'total', 'Total', 'Tong_tien_truoc_VAT', 'Trước thuế'];
         for (let k of keys) {
             if (r[k] != null && String(r[k]).trim() !== "" && !isNaN(Number(r[k]))) return Number(r[k]);
         }
         return 0;
     };

     const profitDataTemp = dataDH.map(row => {
         const so_don_hang = String(row.So_don_hang || row.So_bao_gia || row.So_mua_hang || row.id || row.ID || row.Id || "N/A").trim();
         const dateStr = getRowDateStr(row);
         const d = parseAppSheetDate(dateStr);
         const doanhThu = Number(row.Tong_tien_chua_VAT || row.Tong_tien_truoc_VAT || row.Truoc_thue || row['Tổng tiền trước thuế'] || 0);

         const relatedMH = mhByOrder[so_don_hang] || [];
         const giaVon = relatedMH.reduce((acc, r) => acc + getValTruocThue(r), 0);

         const relatedDGC = dgcByOrder[so_don_hang] || [];
         const chiPhiKhac = relatedDGC.reduce((acc, r) => acc + getValTongTien(r), 0);

         const relatedVC = vcByOrder[so_don_hang] || [];
         const chiPhiVC = relatedVC.reduce((acc, r) => {
             if (r.Tong_tien_VC_coVAT != null && String(r.Tong_tien_VC_coVAT).trim() !== "" && !isNaN(Number(r.Tong_tien_VC_coVAT))) {
                 return acc + (Number(r.Tong_tien_VC_coVAT) / 1.08);
             }
             return acc + getValTruocThue(r);
         }, 0);

         const loiNhuan = doanhThu - giaVon - chiPhiKhac - chiPhiVC;

         return {
            so_don_hang,
            Ngay_bao_gia: dateStr, 
            date: d,
            dateStr: d ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` : dateStr,
            khach_hang: String(getCustomerName(row)).trim(),
            doanhThu,
            giaVon,
            chiPhiKhac,
            chiPhiVC,
            loiNhuan
         };
     });

     const start = startDate ? new Date(startDate).setHours(0,0,0,0) : 0;
     const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;

     const fProfit = profitDataTemp.filter(r => {
        if(!r.date || isNaN(r.date.getTime())) return false;
        return r.date.getTime() >= start && r.date.getTime() <= end;
     }).sort((a,b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

     return {
        filteredProfitData: fProfit,
        totalProfitDoanhThu: fProfit.reduce((acc, r) => acc + r.doanhThu, 0),
        totalProfitGiaVon: fProfit.reduce((acc, r) => acc + r.giaVon, 0),
        totalProfitCpKhac: fProfit.reduce((acc, r) => acc + r.chiPhiKhac, 0),
        totalProfitCpVC: fProfit.reduce((acc, r) => acc + r.chiPhiVC, 0),
        totalProfitFinal: fProfit.reduce((acc, r) => acc + r.loiNhuan, 0)
     }
  }, [dataDH, dataMH, dataDGC, dataVC, startDate, endDate]);

  const NBCustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((entry, index) => {
             const val = entry.value;
             let title = entry.name;
             if (entry.dataKey === 'previousNB' && entry.payload.previousName) {
                title = `${entry.name} (${entry.payload.previousName})`;
             }
             return (
               <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: entry.color, borderRadius: '50%' }}></span>
                  <span style={{ color: entry.color, fontSize: '13px' }}>{title}:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>{val} khách</span>
               </div>
             );
          })}
        </div>
      );
    }
    return null;
  };

  const NCCustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((entry, index) => {
             const val = entry.value;
             let title = entry.name;
             if (entry.dataKey === 'previousNC' && entry.payload.previousName) {
                title = `${entry.name} (${entry.payload.previousName})`;
             }
             return (
               <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: entry.color, borderRadius: '50%' }}></span>
                  <span style={{ color: entry.color, fontSize: '13px' }}>{title}:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>{val} khách</span>
               </div>
             );
          })}
        </div>
      );
    }
    return null;
  };

  const BGCustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((entry, index) => {
             const val = entry.value;
             let title = entry.name;
             if (entry.dataKey === 'previousBG' && entry.payload.previousName) {
                title = `${entry.name} (${entry.payload.previousName})`;
             }
             return (
               <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: entry.color, borderRadius: '50%' }}></span>
                  <span style={{ color: entry.color, fontSize: '13px' }}>{title}:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>{val} phiếu</span>
               </div>
             );
          })}
        </div>
      );
    }
    return null;
  };

  const CRateCustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((entry, index) => {
             const val = entry.value;
             let title = entry.name;
             if (entry.dataKey === 'previousRate' && entry.payload.previousName) {
                title = `${entry.name} (${entry.payload.previousName})`;
             }
             return (
               <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: entry.color, borderRadius: '50%' }}></span>
                  <span style={{ color: entry.color, fontSize: '13px' }}>{title}:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>{val}%</span>
               </div>
             );
          })}
        </div>
      );
    }
    return null;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((entry, index) => {
             const val = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(entry.value);
             let title = entry.name;
             if (entry.dataKey === 'dh') title = "Doanh Thu Hiện Tại";
             if (entry.dataKey === 'previousDH') {
                 title = comparisonName;
                 if (entry.payload.previousName) title = `${title} (${entry.payload.previousName})`;
             }
             return (
               <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: entry.color, borderRadius: '50%' }}></span>
                  <span style={{ color: entry.color, fontSize: '13px' }}>{title}:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>{val}</span>
               </div>
             );
          })}
        </div>
      );
    }
    return null;
  };

  const customerHistoryData = useMemo(() => {
     if (!selectedHistoryCustomer) return [];
     
     const customerOrders = dataDH.filter(row => String(getCustomerName(row)).trim() === selectedHistoryCustomer);
     const quoteDateMap = {};
     dataBG.forEach(b => {
         const id = String(b.So_bao_gia || b.id || b.ID || "").trim();
         if (id) quoteDateMap[id] = parseAppSheetDate(getRowDateStr(b));
     });

     const rawData = customerOrders.map(row => {
         const so_don_hang = String(row.So_don_hang || row.So_bao_gia || row.So_mua_hang || row.id || row.ID || row.Id || "N/A").trim();
         const dhDateStr = getRowDateStr(row);
         const dhDate = parseAppSheetDate(dhDateStr);
         
         const bgDate = quoteDateMap[so_don_hang];
         const bgDateStr = bgDate ? `${String(bgDate.getDate()).padStart(2,'0')}/${String(bgDate.getMonth()+1).padStart(2,'0')}/${bgDate.getFullYear()}` : "N/A";
         
         let waitDays = "N/A";
         if (dhDate && bgDate && !isNaN(dhDate) && !isNaN(bgDate)) {
             const diffTime = dhDate.getTime() - bgDate.getTime();
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             waitDays = diffDays >= 0 ? diffDays : 0;
         }
         const tongTien = Number(row.Tong_tien_chua_VAT || row.Tong_tien_truoc_VAT || row.Truoc_thue || row['Tổng tiền trước thuế'] || row.Thanh_tien_truoc_thue || 0);

         return {
             so_don_hang, bgDateStr, dhDateStr: dhDate ? `${String(dhDate.getDate()).padStart(2,'0')}/${String(dhDate.getMonth()+1).padStart(2,'0')}/${dhDate.getFullYear()}` : (dhDateStr || "N/A"),
             waitDays, tongTien, dateForSort: dhDate ? dhDate.getTime() : 0, dhDate
         };
     });

     return rawData.filter(item => {
        if (!item.dhDate || isNaN(item.dhDate.getTime())) return true;
        const start = historyStartDate ? new Date(historyStartDate).setHours(0,0,0,0) : null;
        const end = historyEndDate ? new Date(historyEndDate).setHours(23,59,59,999) : null;
        const t = item.dhDate.getTime();
        if (start && end) return t >= start && t <= end;
        if (start) return t >= start;
        if (end) return t <= end;
        return true;
     }).sort((a,b) => b.dateForSort - a.dateForSort);
  }, [dataDH, dataBG, selectedHistoryCustomer, historyStartDate, historyEndDate]);

  const todaysOrdersData = useMemo(() => {
     const todayOrders = dataDH.filter(row => {
         const d = parseAppSheetDate(getRowDateStr(row));
         if (!d || isNaN(d)) return false;
         const selD = new Date(todayOrderDate);
         return d.getDate() === selD.getDate() && d.getMonth() === selD.getMonth() && d.getFullYear() === selD.getFullYear();
     });
     
     const quoteDateMap = {};
     dataBG.forEach(b => {
         const id = String(b.So_bao_gia || b.id || b.ID || "").trim();
         if (id) quoteDateMap[id] = parseAppSheetDate(getRowDateStr(b));
     });

     return todayOrders.map(row => {
         const so_don_hang = String(row.So_don_hang || row.So_bao_gia || row.So_mua_hang || row.id || row.ID || row.Id || "N/A").trim();
         const dhDateStr = getRowDateStr(row);
         const dhDate = parseAppSheetDate(dhDateStr);
         
         const bgDate = quoteDateMap[so_don_hang];
         const bgDateStr = bgDate ? `${String(bgDate.getDate()).padStart(2,'0')}/${String(bgDate.getMonth()+1).padStart(2,'0')}/${bgDate.getFullYear()}` : "N/A";
         
         let waitDays = "N/A";
         if (dhDate && bgDate && !isNaN(dhDate) && !isNaN(bgDate)) {
             const diffTime = dhDate.getTime() - bgDate.getTime();
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             waitDays = diffDays >= 0 ? diffDays : 0;
         }

         const tongTien = Number(row.Tong_tien_chua_VAT || row.Tong_tien_truoc_VAT || row.Truoc_thue || row['Tổng tiền trước thuế'] || row.Thanh_tien_truoc_thue || 0);

         return {
             so_don_hang,
             bgDateStr,
             dhDateStr: dhDate ? `${String(dhDate.getDate()).padStart(2,'0')}/${String(dhDate.getMonth()+1).padStart(2,'0')}/${dhDate.getFullYear()}` : (dhDateStr || "N/A"),
             waitDays,
             tongTien,
             khach_hang: String(getCustomerName(row)).trim()
         };
     });
  }, [dataDH, dataBG, todayOrderDate]);


  return (
    <div className="layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-logo">
          <Activity size={28} color="#3b82f6" />
          <span>AppSheetDash</span>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} style={{background: 'none', border: 'none', width: '100%', textAlign: 'left', borderLeft: activeTab === 'overview' ? '3px solid var(--accent-blue)' : 'none'}} onClick={() => setActiveTab('overview')}>
            <LayoutDashboard size={20} /> Tổng quan
          </button>
          <button className={`nav-item ${activeTab === 'profit' ? 'active' : ''}`} style={{background: 'none', border: 'none', width: '100%', textAlign: 'left', borderLeft: activeTab === 'profit' ? '3px solid var(--accent-blue)' : 'none', marginTop: '8px'}} onClick={() => setActiveTab('profit')}>
            <DollarSign size={20} /> Lợi Nhuận Đơn Hàng
          </button>
          <button className="nav-item" style={{background: 'none', border: 'none', width: '100%', textAlign: 'left', marginTop: '8px'}}>
            <FileText size={20} /> Báo Giá
          </button>
          <button className="nav-item" style={{background: 'none', border: 'none', width: '100%', textAlign: 'left'}}>
            <ShoppingCart size={20} /> Đơn Bán Hàng
          </button>
          <button className="nav-item" style={{background: 'none', border: 'none', width: '100%', textAlign: 'left'}}>
            <FileDown size={20} /> Đơn Mua Hàng
          </button>
          <button className="nav-item" style={{background: 'none', border: 'none', width: '100%', textAlign: 'left'}}>
            <Users size={20} /> Nhà Cung Cấp
          </button>
          <button className={`nav-item ${activeTab === 'misa' ? 'active' : ''}`} style={{background: 'none', border: 'none', width: '100%', textAlign: 'left', borderLeft: activeTab === 'misa' ? '3px solid var(--accent-blue)' : 'none', marginTop: '8px'}} onClick={() => setActiveTab('misa')}>
            <Package size={20} /> Misa Mua Hàng
          </button>
          <button className="nav-item" style={{ marginTop: 'auto', background: 'none', border: 'none', width: '100%', textAlign: 'left' }}>
            <Settings size={20} /> Cài đặt
          </button>
        </nav>
      </aside>

      {/* Main Framework */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1>Hiệu suất Kinh doanh</h1>
            <p style={{color: 'var(--text-secondary)'}}>Khoản mục từ Báo Giá, Đơn Bán ra & Đơn Nhập vào.</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
             <div className="user-profile">
               <div className="glass-panel" style={{padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex'}}>
                 <Bell size={20} color="var(--text-secondary)" />
               </div>
               <div className="avatar">AD</div>
             </div>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '100px', fontSize: '24px', color: 'var(--text-secondary)' }}>
             <Activity className="animate-spin" size={32} style={{margin: '0 auto 16px', display: 'block'}} />
             Đang đồng bộ dữ liệu với AppSheet...
          </div>
        ) : activeTab === 'misa' ? (
          <div className="misa-view" style={{padding: '24px'}}>
             <h2 style={{margin: '0 0 24px 0'}}>Dữ Liệu Đơn Mua Hàng Từ MISA AMIS</h2>
             {loadingMisaPurchase ? (
                <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-secondary)' }}>
                   <Activity className="animate-spin" size={32} style={{margin: '0 auto 16px', display: 'block'}} />
                   Đang kết nối và lấy dữ liệu OpenAPI MISA...
                </div>
             ) : misaError ? (
                <div style={{ color: '#ef4444', textAlign: 'center', marginTop: '40px' }}>
                   {misaError}
                </div>
             ) : (
                <div className="glass-panel" style={{overflowX: 'auto', padding: '24px', minHeight: '400px'}}>
                   <table className="data-table">
                     <thead>
                       <tr>
                         <th>Số Phiếu (RefNo)</th>
                         <th>Ngày Mua</th>
                         <th>Nhà Cung Cấp</th>
                         <th style={{textAlign: 'right'}}>Số Hóa Đơn</th>
                         <th style={{textAlign: 'right'}}>Tổng Giá Trị</th>
                       </tr>
                     </thead>
                     <tbody>
                       {misaPurchaseData.slice((misaPage - 1) * itemsPerPage, misaPage * itemsPerPage).map((r, i) => (
                          <tr key={i} style={{borderBottom: '1px solid var(--border-glass)'}}>
                            <td style={{padding: '12px 16px', fontWeight: 600}}>{r.RefNo}</td>
                            <td style={{padding: '12px 16px'}}>{r.RefDate}</td>
                            <td style={{padding: '12px 16px'}}>{r.VendorName}</td>
                            <td style={{padding: '12px 16px', textAlign: 'right'}}>{r.InvNo || '-'}</td>
                            <td style={{padding: '12px 16px', textAlign: 'right', color: '#10b981', fontWeight: 'bold'}}>{new Intl.NumberFormat('vi-VN').format(r.TotalAmount || 0)}</td>
                          </tr>
                       ))}
                       {misaPurchaseData.length === 0 && (
                          <tr><td colSpan="5" style={{textAlign: 'center', padding: '24px'}}>Không có dữ liệu MUA HÀNG từ MISA.</td></tr>
                       )}
                     </tbody>
                   </table>
                   
                   {misaPurchaseData.length > itemsPerPage && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', gap: '16px', borderTop: '1px solid var(--border-glass)' }}>
                         <button onClick={() => setMisaPage(p => Math.max(1, p - 1))} disabled={misaPage === 1} style={{ padding: '6px 12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', borderRadius: '6px', cursor: misaPage === 1 ? 'not-allowed' : 'pointer', color: 'var(--text-primary)'}}>Trước</button>
                         <span style={{color: 'var(--text-secondary)'}}>Trang {misaPage} / {Math.ceil(misaPurchaseData.length / itemsPerPage)}</span>
                         <button onClick={() => setMisaPage(p => Math.min(Math.ceil(misaPurchaseData.length / itemsPerPage), p + 1))} disabled={misaPage >= Math.ceil(misaPurchaseData.length / itemsPerPage)} style={{ padding: '6px 12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', borderRadius: '6px', cursor: misaPage >= Math.ceil(misaPurchaseData.length / itemsPerPage) ? 'not-allowed' : 'pointer', color: 'var(--text-primary)'}}>Sau</button>
                      </div>
                   )}
                </div>
             )}
          </div>
        ) : activeTab === 'profit' ? (
          <div className="profit-view" style={{padding: '24px'}}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{margin: 0}}>Báo Cáo Lợi Nhuận Đơn Hàng</h2>
                <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Filter size={18} color="var(--text-secondary)" />
                  <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light'}} />
                  <span style={{color: 'var(--text-secondary)'}}>-</span>
                  <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light'}} />
                </div>
             </div>

             <div className="kpi-cards" style={{marginBottom: '24px'}}>
               <div className="kpi-card glass-panel" style={{border: '1px solid rgba(16, 185, 129, 0.2)'}}>
                 <div className="kpi-header"><span>Tổng Doanh Thu</span></div>
                 <div className="kpi-value" style={{color: '#10b981'}}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalProfitDoanhThu)}</div>
               </div>
               <div className="kpi-card glass-panel" style={{border: '1px solid rgba(239, 68, 68, 0.2)'}}>
                 <div className="kpi-header"><span>Tổng Giá Vốn (Mua hàng)</span></div>
                 <div className="kpi-value" style={{color: '#ef4444'}}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalProfitGiaVon)}</div>
               </div>
               <div className="kpi-card glass-panel" style={{border: '1px solid rgba(245, 158, 11, 0.2)'}}>
                 <div className="kpi-header"><span>C.Phí Khác + Vận Chuyển</span></div>
                 <div className="kpi-value" style={{color: '#f59e0b'}}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalProfitCpKhac + totalProfitCpVC)}</div>
               </div>
               <div className="kpi-card glass-panel" style={{border: '1px solid rgba(139, 92, 246, 0.2)'}}>
                 <div className="kpi-header"><span>Tổng Lợi Nhuận (Gộp)</span></div>
                 <div className="kpi-value" style={{color: '#8b5cf6'}}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalProfitFinal)}</div>
               </div>
             </div>

             <div className="glass-panel" style={{overflowX: 'auto', padding: '24px', minHeight: '400px'}}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Số Đơn Hàng</th>
                      <th>Ngày</th>
                      <th>Khách Hàng</th>
                      <th style={{textAlign: 'right'}}>Doanh Thu</th>
                      <th style={{textAlign: 'right'}}>Giá Vốn (MH)</th>
                      <th style={{textAlign: 'right'}}>Đề Nghị Chi</th>
                      <th style={{textAlign: 'right'}}>Vận Chuyển</th>
                      <th style={{textAlign: 'right'}}>Lợi Nhuận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfitData.slice((profitPage - 1) * itemsPerPage, profitPage * itemsPerPage).map((r, i) => (
                       <tr key={i} style={{borderBottom: '1px solid var(--border-glass)'}}>
                         <td 
                            style={{padding: '12px 16px', fontWeight: 600, color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline'}}
                            onClick={() => setSelectedHistoryCustomer(r.khach_hang)}
                            title={`Xem lịch sử khách hàng ${r.khach_hang}`}
                         >
                            {r.so_don_hang}
                         </td>
                         <td style={{padding: '12px 16px'}}>{r.dateStr}</td>
                         <td style={{padding: '12px 16px'}}>{r.khach_hang}</td>
                         <td style={{padding: '12px 16px', textAlign: 'right', color: '#10b981'}}>{new Intl.NumberFormat('vi-VN').format(r.doanhThu)}</td>
                         <td style={{padding: '12px 16px', textAlign: 'right', color: '#ef4444'}}>{new Intl.NumberFormat('vi-VN').format(r.giaVon)}</td>
                         <td style={{padding: '12px 16px', textAlign: 'right', color: '#f59e0b'}}>{new Intl.NumberFormat('vi-VN').format(r.chiPhiKhac)}</td>
                         <td style={{padding: '12px 16px', textAlign: 'right', color: '#f59e0b'}}>{new Intl.NumberFormat('vi-VN').format(r.chiPhiVC)}</td>
                         <td style={{padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: r.loiNhuan >= 0 ? '#8b5cf6' : '#ef4444'}}>{new Intl.NumberFormat('vi-VN').format(r.loiNhuan)}</td>
                       </tr>
                    ))}
                    {filteredProfitData.length === 0 && (
                       <tr><td colSpan="8" style={{textAlign: 'center', padding: '24px'}}>Không có dữ liệu lợi nhuận trong khoảng thời gian này.</td></tr>
                    )}
                  </tbody>
                </table>

                {filteredProfitData.length > itemsPerPage && (
                   <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', gap: '16px', borderTop: '1px solid var(--border-glass)' }}>
                      <button onClick={() => setProfitPage(p => Math.max(1, p - 1))} disabled={profitPage === 1} style={{ padding: '6px 12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', borderRadius: '6px', cursor: profitPage === 1 ? 'not-allowed' : 'pointer', color: 'var(--text-primary)'}}>Trước</button>
                      <span style={{color: 'var(--text-secondary)'}}>Trang {profitPage} / {Math.ceil(filteredProfitData.length / itemsPerPage)}</span>
                      <button onClick={() => setProfitPage(p => Math.min(Math.ceil(filteredProfitData.length / itemsPerPage), p + 1))} disabled={profitPage >= Math.ceil(filteredProfitData.length / itemsPerPage)} style={{ padding: '6px 12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', borderRadius: '6px', cursor: profitPage >= Math.ceil(filteredProfitData.length / itemsPerPage) ? 'not-allowed' : 'pointer', color: 'var(--text-primary)'}}>Sau</button>
                   </div>
                )}
             </div>
          </div>
        ) : (
          <div className="dashboard-grid">
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
               {/* Section 1: Khách Hàng Mới Area */}
               <div className="glass-panel" style={{ margin: 0, padding: '24px', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                     <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                       <h3 style={{ margin: 0, color: '#8b5cf6', fontSize: '16px', fontWeight: 'bold' }}>Khách Hàng Mới</h3>
                       <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{newCustomersToday}</span>
                       <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', fontWeight: '500' }}>
                         <Users size={14}/> trong kỳ báo cáo
                       </span>
                     </div>
                     <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', borderRadius: '16px' }}>
                       <input type="date" value={ncStartDate} onChange={e=>setNcStartDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '12px'}} />
                       <span style={{color: 'var(--text-secondary)'}}>-</span>
                       <input type="date" value={ncEndDate} onChange={e=>setNcEndDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '12px'}} />
                     </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                   <LineChart data={ncComparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false}/>
                      <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 11}} />
                      <YAxis stroke="var(--text-secondary)" tick={{fontSize: 11}} allowDecimals={false} />
                      <Tooltip content={<NCCustomTooltip />} />
                      <Legend verticalAlign="top" height={36}/>
                      <Line type="monotone" dataKey="nc" name="Khách Mới Trong Kỳ" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6'}} activeDot={{r: 6}} />
                      <Line type="monotone" dataKey="previousNC" name={ncComparisonName} stroke="#d8b4fe" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>

               {/* Section 2: Khách Chốt Đơn Đầu Area */}
               <div className="glass-panel" style={{ margin: 0, padding: '24px', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                     <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                       <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '16px', fontWeight: 'bold' }}>Khách Có Đơn Mới</h3>
                       <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{newBuyersToday}</span>
                       <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', fontWeight: '500' }}>
                         <Users size={14}/> có đơn đầu trong kỳ
                       </span>
                       {newBuyersOrderIds.length > 0 && (
                          <span style={{fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '6px'}}>
                            ({newBuyersOrderIds.slice(0,2).join(', ')})
                          </span>
                       )}
                     </div>
                     <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', borderRadius: '16px' }}>
                       <input type="date" value={nbStartDate} onChange={e=>setNbStartDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '12px'}} />
                       <span style={{color: 'var(--text-secondary)'}}>-</span>
                       <input type="date" value={nbEndDate} onChange={e=>setNbEndDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '12px'}} />
                     </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                   <LineChart data={nbComparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false}/>
                      <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 11}} />
                      <YAxis stroke="var(--text-secondary)" tick={{fontSize: 11}} allowDecimals={false} />
                      <Tooltip content={<NBCustomTooltip />} />
                      <Legend verticalAlign="top" height={36}/>
                      <Line type="monotone" dataKey="nb" name="Khách Đơn Mới Trong Kỳ" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, fill: '#f59e0b'}} activeDot={{r: 6}} />
                      <Line type="monotone" dataKey="previousNB" name={nbComparisonName} stroke="#fde68a" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>

               {/* Section 3: Báo Giá Area */}
               <div className="glass-panel" style={{ margin: 0, padding: '24px', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                     <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                       <h3 style={{ margin: 0, color: '#3b82f6', fontSize: '16px', fontWeight: 'bold' }}>Số Lượng Báo Giá</h3>
                       <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{quotesInPeriod}</span>
                       <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', fontWeight: '500' }}>
                         <FileText size={14}/> phiếu trong kỳ
                       </span>
                     </div>
                     <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', borderRadius: '16px' }}>
                       <input type="date" value={bgStartDate} onChange={e=>setBgStartDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '12px'}} />
                       <span style={{color: 'var(--text-secondary)'}}>-</span>
                       <input type="date" value={bgEndDate} onChange={e=>setBgEndDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '12px'}} />
                     </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                   <LineChart data={bgComparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false}/>
                      <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 11}} />
                      <YAxis stroke="var(--text-secondary)" tick={{fontSize: 11}} allowDecimals={false} />
                      <Tooltip content={<BGCustomTooltip />} />
                      <Legend verticalAlign="top" height={36}/>
                      <Line type="monotone" dataKey="bg" name="Báo Giá Trong Kỳ" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} activeDot={{r: 6}} />
                      <Line type="monotone" dataKey="previousBG" name={bgComparisonName} stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>

               {/* Section 4: Tỷ Lệ Chốt Area */}
               <div className="glass-panel" style={{ margin: 0, padding: '24px', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                     <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                       <h3 style={{ margin: 0, color: '#ec4899', fontSize: '16px', fontWeight: 'bold' }}>Tỷ Lệ Chốt</h3>
                       <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{currentCrate}%</span>
                       <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', fontWeight: '500' }}>
                         <Activity size={14}/> trong kỳ
                       </span>
                     </div>
                     <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', borderRadius: '16px' }}>
                       <input type="date" value={crateStartDate} onChange={e=>setCrateStartDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '12px'}} />
                       <span style={{color: 'var(--text-secondary)'}}>-</span>
                       <input type="date" value={crateEndDate} onChange={e=>setCrateEndDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '12px'}} />
                     </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                   <LineChart data={crateComparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false}/>
                      <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 11}} />
                      <YAxis stroke="var(--text-secondary)" tick={{fontSize: 11}} />
                      <Tooltip content={<CRateCustomTooltip />} />
                      <Legend verticalAlign="top" height={36}/>
                      <Line type="monotone" dataKey="rate" name="Tỷ Lệ Chốt Trong Kỳ" stroke="#ec4899" strokeWidth={3} dot={{r: 4, fill: '#ec4899'}} activeDot={{r: 6}} />
                      <Line type="monotone" dataKey="previousRate" name={crateComparisonName} stroke="#fbcfe8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>


            {/* Other KPIs Section */}
            <div className="kpi-cards" style={{gridColumn: 'span 12', marginBottom: '24px'}}>
              <div className="kpi-card glass-panel" style={{border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                <div className="kpi-header">
                  <span>Tổng Báo Giá</span>
                  <div style={{padding: '6px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)'}}>
                     <FileCheck size={18} color="#3b82f6" />
                  </div>
                </div>
                <div className="kpi-value">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalBG)}</div>
                <div className="kpi-trend trend-up"><TrendingUp size={14}/> {filteredBG.length} phiếu báo giá</div>
              </div>
              
              <div className="kpi-card glass-panel" style={{border: '1px solid rgba(16, 185, 129, 0.2)'}}>
                <div className="kpi-header">
                  <span>Doanh Thu (Đơn Bán)</span>
                  <div style={{padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)'}}>
                     <DollarSign size={18} color="#10b981" />
                  </div>
                </div>
                <div className="kpi-value">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalDH)}</div>
                <div className="kpi-trend trend-up"><TrendingUp size={14}/> {filteredDH.length} đơn hàng</div>
              </div>

              <div className="kpi-card glass-panel" style={{border: '1px solid rgba(239, 68, 68, 0.2)'}}>
                <div className="kpi-header">
                  <span>Chi Phí (Đơn Mua)</span>
                  <div style={{padding: '6px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)'}}>
                     <FileDown size={18} color="#ef4444" />
                  </div>
                </div>
                <div className="kpi-value">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalMH)}</div>
                <div className="kpi-trend trend-down"><TrendingUp size={14} style={{transform: 'rotate(180deg)'}}/> {filteredMH.length} đơn mua</div>
              </div>
            </div>

            {/* Main Graphs Area Dashboard */}
            <div className="chart-container glass-panel" style={{gridColumn: 'span 12', height: 'auto', minHeight: '450px', marginBottom: '24px'}}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <h3 className="chart-title" style={{ margin: 0 }}>Biểu Đồ Doanh Thu Từng Ngày</h3>
                  <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Filter size={18} color="var(--text-secondary)" />
                    <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light'}} />
                    <span style={{color: 'var(--text-secondary)'}}>-</span>
                    <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light'}} />
                  </div>
               </div>
               <ResponsiveContainer width="100%" height={350}>
                <LineChart data={comparisonChartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false}/>
                   <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                   <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                   <Tooltip content={<CustomTooltip />} />
                   <Legend verticalAlign="top" height={36}/>
                   <Line type="monotone" dataKey="dh" name={legendCurrentDH} stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981'}} activeDot={{r: 8}} />
                   <Line type="monotone" dataKey="previousDH" name={legendPreviousDH} stroke={compareMode === 'week' ? "#f59e0b" : "#ef4444"} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Customer Conversion Report */}
            <div className="report-container glass-panel" style={{gridColumn: '1 / -1', padding: '24px', marginBottom: '24px'}}>
               <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '24px' }}>
                  <h3 className="chart-title" style={{ margin: 0 }}>Báo Cáo Tỷ Lệ Chốt Đơn Của Khách Hàng</h3>
                  <div style={{ padding: '6px 16px', display: 'flex', gap: '12px', alignItems: 'center', borderRadius: '24px', background: 'white', border: '1px solid var(--border-glass)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <Filter size={16} color="var(--text-secondary)" />
                    <input type="date" value={crStartDate} onChange={e=>setCrStartDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '13px'}} />
                    <span style={{color: 'var(--text-secondary)'}}>-</span>
                    <input type="date" value={crEndDate} onChange={e=>setCrEndDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '13px'}} />
                  </div>
               </div>

               <div style={{ border: '1px dashed var(--border-glass)', borderRadius: '12px', padding: '24px', minHeight: '150px' }}>
                  <div style={{ position: 'relative', marginBottom: selectedCustomers.length > 0 ? '24px' : '40px', maxWidth: '300px' }}>
                     <input 
                        value={customerSearchQuery} 
                        onChange={e => setCustomerSearchQuery(e.target.value)}
                        placeholder="-- Gõ tên khách tìm kiếm --"
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'white', outline: 'none', color: 'var(--text-primary)', width: '100%', boxSizing: 'border-box' }}
                     />
                     {customerSearchQuery && customerSearchQuery.trim().length > 0 && (
                        <ul className="custom-scrollbar" style={{ background: 'white', position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '250px', overflowY: 'auto', zIndex: 100, padding: 0, margin: '4px 0 0 0', listStyle: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                           {uniqueCustomers.filter(c => c.toLowerCase().includes(customerSearchQuery.toLowerCase())).length > 0 ? (
                              uniqueCustomers.filter(c => c.toLowerCase().includes(customerSearchQuery.toLowerCase())).map(c => {
                                 const isSelected = selectedCustomers.includes(c);
                                 return (
                                     <li 
                                        key={c} 
                                        onMouseDown={(e) => {
                                           e.preventDefault();
                                           if (isSelected) {
                                              setSelectedCustomers(prev => prev.filter(item => item !== c));
                                           } else {
                                              setSelectedCustomers(prev => [...prev, c]);
                                           }
                                        }}
                                        style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                     >
                                        <input type="checkbox" checked={isSelected} readOnly style={{ cursor: 'pointer' }} />
                                        {c}
                                     </li>
                                 );
                              })
                           ) : (
                              <li style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>Không tìm thấy khách hàng...</li>
                           )}
                        </ul>
                     )}
                  </div>

                  {selectedCustomerStats.length > 0 ? (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {selectedCustomerStats.map(stat => (
                           <div key={stat.name} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px', borderBottom: '1px dashed var(--border-glass)' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '6px 16px', borderRadius: '16px', fontSize: '13px', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.2)', width: 'fit-content' }}>
                                 - {stat.name}
                                 <button onClick={() => setSelectedCustomers(prev => prev.filter(item => item !== stat.name))} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>&times;</button>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                 <div className="glass-panel" style={{padding: '16px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                                    <div style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px'}}>Số lượng Báo Giá</div>
                                    <div style={{fontSize: '24px', fontWeight: 600, color: '#3b82f6'}}>{stat.baoGiaCount} <span style={{fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>phiếu</span></div>
                                 </div>
                                 <div className="glass-panel" style={{padding: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)'}}>
                                    <div style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px'}}>Số lượng Đơn Chốt</div>
                                    <div style={{fontSize: '24px', fontWeight: 600, color: '#10b981'}}>{stat.donHangCount} <span style={{fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>đơn</span></div>
                                 </div>
                                 <div className="glass-panel" style={{padding: '16px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)'}}>
                                    <div style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px'}}>Tỷ Lệ Chốt (Số lượng)</div>
                                    <div style={{fontSize: '24px', fontWeight: 600, color: '#8b5cf6'}}>{stat.conversionRate}%</div>
                                 </div>
                                 <div className="glass-panel" style={{padding: '16px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)'}}>
                                    <div style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px'}}>Giá Trị Chốt Thực Tế</div>
                                    <div style={{fontSize: '24px', fontWeight: 600, color: '#f59e0b'}}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stat.doanhThu)}</div>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  ) : (
                    <div style={{textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0'}}>
                       Vui lòng chọn khách hàng trên để xem báo cáo chi tiết tỷ lệ chuyển đổi.
                    </div>
                  )}
               </div>
            </div>

            {/* Product Conversion Report */}
            <div className="report-container glass-panel" style={{gridColumn: '1 / -1', padding: '24px', marginBottom: '24px'}}>
               <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '24px' }}>
                  <h3 className="chart-title" style={{ margin: 0, color: '#10b981' }}>Báo Cáo Tỷ Lệ Chốt Theo Tên Sản Phẩm</h3>
                  <div style={{ padding: '6px 16px', display: 'flex', gap: '12px', alignItems: 'center', borderRadius: '24px', background: 'white', border: '1px solid var(--border-glass)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <Filter size={16} color="var(--text-secondary)" />
                    <input type="date" value={prStartDate} onChange={e=>setPrStartDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '13px'}} />
                    <span style={{color: 'var(--text-secondary)'}}>-</span>
                    <input type="date" value={prEndDate} onChange={e=>setPrEndDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '13px'}} />
                  </div>
               </div>

               <div style={{ border: '1px dashed var(--border-glass)', borderRadius: '12px', padding: '24px', minHeight: '150px' }}>
                  <div style={{ position: 'relative', marginBottom: selectedProducts.length > 0 ? '24px' : '40px', maxWidth: '300px' }}>
                     <input 
                        value={productSearchQuery} 
                        onChange={e => setProductSearchQuery(e.target.value)}
                        placeholder="-- Gõ tên sản phẩm tìm kiếm --"
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'white', outline: 'none', color: 'var(--text-primary)', width: '100%', boxSizing: 'border-box' }}
                     />
                     {productSearchQuery && productSearchQuery.trim().length > 0 && (
                        <ul className="custom-scrollbar" style={{ background: 'white', position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '250px', overflowY: 'auto', zIndex: 100, padding: 0, margin: '4px 0 0 0', listStyle: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                           {uniqueProducts.filter(p => p.toLowerCase().includes(productSearchQuery.toLowerCase())).length > 0 ? (
                              uniqueProducts.filter(p => p.toLowerCase().includes(productSearchQuery.toLowerCase())).map(p => {
                                 const isSelected = selectedProducts.includes(p);
                                 return (
                                     <li 
                                        key={p} 
                                        onMouseDown={(e) => {
                                           e.preventDefault();
                                           if (isSelected) {
                                              setSelectedProducts(prev => prev.filter(item => item !== p));
                                           } else {
                                              setSelectedProducts(prev => [...prev, p]);
                                           }
                                        }}
                                        style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                     >
                                        <input type="checkbox" checked={isSelected} readOnly style={{ cursor: 'pointer', accentColor: '#10b981' }} />
                                        {p}
                                     </li>
                                 );
                              })
                           ) : (
                              <li style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>Không tìm thấy sản phẩm...</li>
                           )}
                        </ul>
                     )}
                  </div>

                  {selectedProductStats.length > 0 ? (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {selectedProductStats.map(stat => (
                           <div key={stat.name} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px', borderBottom: '1px dashed var(--border-glass)' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 16px', borderRadius: '16px', fontSize: '13px', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.2)', width: 'fit-content' }}>
                                 - {stat.name}
                                 <button onClick={() => setSelectedProducts(prev => prev.filter(item => item !== stat.name))} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>&times;</button>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                 <div className="glass-panel" style={{padding: '16px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                                    <div style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px'}}>Số lượng Lên Báo Giá</div>
                                    <div style={{fontSize: '24px', fontWeight: 600, color: '#3b82f6'}}>{stat.qtyBaoGia} <span style={{fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>sp</span></div>
                                 </div>
                                 <div className="glass-panel" style={{padding: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)'}}>
                                    <div style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px'}}>Số lượng Đã Chốt</div>
                                    <div style={{fontSize: '24px', fontWeight: 600, color: '#10b981'}}>{stat.qtyDonHang} <span style={{fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>sp</span></div>
                                 </div>
                                 <div className="glass-panel" style={{padding: '16px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)'}}>
                                    <div style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px'}}>Tỷ Lệ Chốt (Mặt hàng)</div>
                                    <div style={{fontSize: '24px', fontWeight: 600, color: '#8b5cf6'}}>{stat.qtyConversionRate}%</div>
                                 </div>
                                 <div className="glass-panel" style={{padding: '16px', background: 'rgba(236, 72, 153, 0.05)', border: '1px solid rgba(236, 72, 153, 0.2)'}}>
                                    <div style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px'}}>Tỷ Lệ Chốt (Phiếu)</div>
                                    <div style={{fontSize: '24px', fontWeight: 600, color: '#ec4899'}}>{stat.conversionRate}% <span style={{fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)'}}>({stat.donHangCount}/{stat.baoGiaCount})</span></div>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  ) : (
                    <div style={{textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0'}}>
                       Vui lòng chọn tên sản phẩm ở phần trên để chạy thống kê.
                    </div>
                  )}
               </div>
            </div>

            {/* Today's Orders Table */}
            <div className="report-container glass-panel" style={{gridColumn: '1 / -1', padding: '24px', marginBottom: '24px'}}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <h3 className="chart-title" style={{ margin: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <ShoppingCart size={18} color="#3b82f6" /> Danh Sách Đơn Hàng (Theo Ngày)
                  </h3>
                  <div style={{ padding: '6px 16px', display: 'flex', gap: '12px', alignItems: 'center', borderRadius: '24px', background: 'white', border: '1px solid var(--border-glass)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <Filter size={16} color="var(--text-secondary)" />
                    <input type="date" value={todayOrderDate} onChange={e=>setTodayOrderDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '13px'}} />
                  </div>
               </div>
               
               <div style={{ border: '1px dashed var(--border-glass)', borderRadius: '12px', padding: '16px', overflowX: 'auto' }}>
                 <table className="data-table" style={{ width: '100%' }}>
                   <thead>
                     <tr>
                       <th style={{width: '60px', textAlign: 'center'}}>STT</th>
                       <th>Số Đơn Hàng</th>
                       <th>Ngày Báo Giá</th>
                       <th style={{textAlign: 'center'}}>Số Ngày Chờ Chốt Đơn</th>
                       <th style={{textAlign: 'right'}}>Tổng Tiền Chưa VAT</th>
                     </tr>
                   </thead>
                   <tbody>
                     {todaysOrdersData.length > 0 ? (
                        todaysOrdersData.map((order, i) => (
                           <tr key={i} style={{borderBottom: '1px solid var(--border-glass)'}}>
                             <td style={{padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)'}}>{i + 1}</td>
                             <td 
                               style={{padding: '12px 16px', fontWeight: 600, color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline'}} 
                               onClick={() => setSelectedHistoryCustomer(order.khach_hang)}
                               title={`Xem lịch sử khách hàng ${order.khach_hang}`}
                             >
                               {order.so_don_hang}
                             </td>
                             <td style={{padding: '12px 16px', color: 'var(--text-secondary)'}}>{order.bgDateStr}</td>
                             <td style={{padding: '12px 16px', textAlign: 'center', fontWeight: 'bold', color: order.waitDays !== "N/A" ? (order.waitDays > 3 ? '#ef4444' : '#10b981') : 'var(--text-secondary)'}}>
                               {order.waitDays !== "N/A" ? `${order.waitDays} ngày` : "-"}
                             </td>
                             <td style={{padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#f59e0b'}}>
                               {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.tongTien)}
                             </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan="5" style={{textAlign: 'center', padding: '24px', color: 'var(--text-secondary)'}}>
                              Chưa có đơn chốt nào trong hôm nay.
                           </td>
                        </tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>

            {/* Row 3: Top Ranking Tables */}
            <div className="half-container glass-panel" style={{overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
               <h3 className="chart-title" style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={18} color="var(--accent-green)" /> Top 50 Khách Hàng (Doanh Thu)</h3>
               <div style={{ flex: 1, overflowY: 'auto' }}>
                 <table className="data-table">
                   <thead>
                     <tr>
                       <th>Tên Khách Hàng</th>
                       <th style={{textAlign: 'right'}}>Doanh Thu</th>
                     </tr>
                   </thead>
                   <tbody>
                     {topCustomers.map((c, i) => (
                        <tr key={i} style={{borderBottom: '1px solid var(--border-glass)'}}>
                          <td style={{padding: '12px 16px', fontWeight: 500}}>{i+1}. {c[0]}</td>
                          <td style={{padding: '12px 16px', textAlign: 'right', color: 'var(--accent-green)', fontWeight: 600}}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c[1])}
                          </td>
                        </tr>
                     ))}
                   </tbody>
                 </table>
                 {topCustomers.length === 0 && <div style={{textAlign: 'center', padding: '24px', color: 'var(--text-secondary)'}}>Thu thập dữ liệu lỗi hoặc trống...</div>}
               </div>
            </div>

            <div className="half-container glass-panel" style={{overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
               <h3 className="chart-title" style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={18} color="var(--accent-red)" /> Top 5 Nhà Cung Cấp (Giá Trị Mua)</h3>
               <div style={{ flex: 1, overflowY: 'auto' }}>
                 <table className="data-table">
                   <thead>
                     <tr>
                       <th>Nhà Cung Cấp</th>
                       <th style={{textAlign: 'right'}}>Giá Trị</th>
                     </tr>
                   </thead>
                   <tbody>
                     {topSuppliers.map((s, i) => (
                        <tr key={i} style={{borderBottom: '1px solid var(--border-glass)'}}>
                          <td style={{padding: '12px 16px', fontWeight: 500}}>{i+1}. {s[0]}</td>
                          <td style={{padding: '12px 16px', textAlign: 'right', color: 'var(--accent-red)', fontWeight: 600}}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(s[1])}
                          </td>
                        </tr>
                     ))}
                   </tbody>
                 </table>
                 {topSuppliers.length === 0 && <div style={{textAlign: 'center', padding: '24px', color: 'var(--text-secondary)'}}>Thu thập dữ liệu lỗi hoặc trống...</div>}
               </div>
            </div>

            {/* Row 4: Products & Activity Layouts */}
            <div className="half-container glass-panel" style={{overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                 <h3 className="chart-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={18} color="var(--accent-blue)" /> Top 5 Mặt Hàng Chủ Đạo
                 </h3>
               </div>
               {finalTopProducts.length > 0 ? (
                 <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   {finalTopProducts.map((p, i) => (
                      <div key={i}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                            <span style={{fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%'}} title={p.name}>{p.name}</span>
                            <span style={{color: 'var(--text-secondary)'}}>{p.sold} lượt xuất đơn</span>
                         </div>
                         <div style={{ width: '100%', background: 'var(--bg-glass)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${(p.sold / p.target)*100}%`, background: p.color, height: '100%', borderRadius: '4px' }}></div>
                         </div>
                      </div>
                   ))}
                 </div>
               ) : (
                 <div style={{textAlign: 'center', padding: '24px', color: 'var(--text-secondary)'}}>Không tìm thấy tên sản phẩm trong dữ liệu (hoặc bảng chi tiết trống).</div>
               )}
            </div>

            <div className="half-container glass-panel" style={{overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
               <h3 className="chart-title" style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={18} color="var(--accent-purple)" /> Luồng Hoạt Động (Activity Feed)
               </h3>
               <div style={{ flex: 1, overflowY: 'auto' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {recentActivities.length > 0 ? recentActivities.map((act, i) => {
                       const code = act.So_bao_gia || act.id || act.ID || act.So_don_hang || "N/A";
                       const dt = act.Ngay_bao_gia || act.Ngay_ban_hang || act.date || act.Date || act['Ngày tạo'] || "N/A";
                       const client = String(getCustomerName(act)).trim();
                       return (
                          <div key={i} style={{ display: 'flex', gap: '12px' }}>
                             <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: act.actType==='baogia' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                {act.actType === 'baogia' ? <FileText size={18} color="#3b82f6" /> : <ShoppingCart size={18} color="#10b981" />}
                             </div>
                             <div>
                                <div style={{ fontSize: '14px', fontWeight: 500 }}>
                                   {act.actType==='baogia' ? `Lập báo giá mới [${code}]` : `Chốt đơn hàng thành công [${code}]`}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                   Khách hàng: {client}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{dt}</div>
                             </div>
                          </div>
                       )
                    }) : (
                       <div style={{textAlign: 'center', padding: '24px', color: 'var(--text-secondary)'}}>Không có hoạt động nào...</div>
                    )}
                  </div>
               </div>
            </div>

          </div>
        )}
      </main>

      {/* Customer History Modal */}
      {selectedHistoryCustomer && (
         <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '24px' }}
            onClick={() => { setSelectedHistoryCustomer(null); setHistoryStartDate(''); setHistoryEndDate(''); }}
         >
            <div 
               className="glass-panel custom-scrollbar" 
               style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}
               onClick={(e) => e.stopPropagation()}
            >
               <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)', flexWrap: 'wrap', gap: '16px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <FileText size={20} color="#3b82f6" /> Lịch sử đơn hàng: {selectedHistoryCustomer}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', borderRadius: '16px', margin: 0, background: 'white' }}>
                          <Filter size={14} color="var(--text-secondary)" />
                          <input type="date" value={historyStartDate} onChange={e=>setHistoryStartDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '13px'}} />
                          <span style={{color: 'var(--text-secondary)'}}>-</span>
                          <input type="date" value={historyEndDate} onChange={e=>setHistoryEndDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', colorScheme: 'light', fontSize: '13px'}} />
                      </div>
                      <button onClick={() => { setSelectedHistoryCustomer(null); setHistoryStartDate(''); setHistoryEndDate(''); }} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                  </div>
               </div>
               
               <div style={{ display: 'flex', gap: '16px', padding: '20px 24px', background: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px solid var(--border-glass)', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                     <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tổng số đơn chốt</div>
                     <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{customerHistoryData.length} đơn</div>
                  </div>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                     <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tổng doanh thu (Chưa VAT)</div>
                     <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(customerHistoryData.reduce((sum, curr) => sum + curr.tongTien, 0))}</div>
                  </div>
               </div>

               <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{width: '60px', textAlign: 'center'}}>STT</th>
                        <th>Mã Đơn Hàng</th>
                        <th>Ngày Báo Giá</th>
                        <th>Ngày Đơn Hàng</th>
                        <th style={{textAlign: 'center'}}>Ngày Chờ Chốt</th>
                        <th style={{textAlign: 'right'}}>Số Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerHistoryData.length > 0 ? customerHistoryData.map((order, idx) => (
                         <tr key={idx} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                           <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                           <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{order.so_don_hang}</td>
                           <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{order.bgDateStr}</td>
                           <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{order.dhDateStr}</td>
                           <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold', color: order.waitDays !== "N/A" ? (order.waitDays > 3 ? '#ef4444' : '#10b981') : 'var(--text-secondary)' }}>
                              {order.waitDays !== "N/A" ? `${order.waitDays} ngày` : "-"}
                           </td>
                           <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.tongTien)}
                           </td>
                         </tr>
                      )) : (
                         <tr><td colSpan="6" style={{textAlign: 'center', padding: '24px', color: 'var(--text-secondary)'}}>Không có lịch sử đơn hàng.</td></tr>
                      )}
                    </tbody>
                  </table>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

export default App;

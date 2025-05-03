const currents = async () => {
    const snapshot = await getDocs(collection(db, 'currents'));
    const batch = writeBatch(db);

    snapshot.forEach(docSnap => {
      let docData = {...docSnap.data()}
      docData.ingredientName = docData.ingredientData.ingredientName || "", 
      docData.ingredientTypes = docData.ingredientData.ingredientType || [],
      docData.ingredientStore = docData.ingredientStore === "" ? "-" : docData.ingredientStore === "a" ? "Aldi" : docData.ingredientStore === "mb" ? "MarketBasket" : docData.ingredientStore === "sm" ? "StarMarket" : docData.ingredientStore === "ss" ? "StopAndShop" : docData.ingredientStore === "t" ? "Target" : docData.ingredientStore === "w" ? "Walmart" : "-",
      docData.ingredientData = {
        '-':  {
          calServing: docData.ingredientData.CalServing || "",
          servingSize: docData.ingredientData.ServingSize || "",
          unit: docData.ingredientData.Unit || "",
        },
        'Aldi': {
          brand: docData.ingredientData.aBrand || "",
          calContainer: docData.ingredientData.aCalContainer || "",
          calServing: docData.ingredientData.aCalServing || "",
          link: docData.ingredientData.aLink || "",
          priceContainer: docData.ingredientData.aPriceContainer || "",
          priceServing: docData.ingredientData.aPriceServing || "",
          servingContainer: docData.ingredientData.aServingContainer || "",
          servingSize: docData.ingredientData.aServingSize || "",
          totalYield: docData.ingredientData.aTotalYield || "",
          unit: docData.ingredientData.aUnit || "",
        },
        'MarketBasket': {
          brand: docData.ingredientData.mbBrand || "",
          calContainer: docData.ingredientData.mbCalContainer || "",
          calServing: docData.ingredientData.mbCalServing || "",
          link: docData.ingredientData.mbLink || "",
          priceContainer: docData.ingredientData.mbPriceContainer || "",
          priceServing: docData.ingredientData.mbPriceServing || "",
          servingContainer: docData.ingredientData.mbServingContainer || "",
          servingSize: docData.ingredientData.mbServingSize || "",
          totalYield: docData.ingredientData.mbTotalYield || "",
          unit: docData.ingredientData.mbUnit || "",
        },
        'StarMarket': {
          brand: docData.ingredientData.smBrand || "",
          calContainer: docData.ingredientData.smCalContainer || "",
          calServing: docData.ingredientData.smCalServing || "",
          link: docData.ingredientData.smLink || "",
          priceContainer: docData.ingredientData.smPriceContainer || "",
          priceServing: docData.ingredientData.smPriceServing || "",
          servingContainer: docData.ingredientData.smServingContainer || "",
          servingSize: docData.ingredientData.smServingSize || "",
          totalYield: docData.ingredientData.smTotalYield || "",
          unit: docData.ingredientData.smUnit || "",
        },
        'StopAndShop': {
          brand: docData.ingredientData.ssBrand || "",
          calContainer: docData.ingredientData.ssCalContainer || "",
          calServing: docData.ingredientData.ssCalServing || "",
          link: docData.ingredientData.ssLink || "",
          priceContainer: docData.ingredientData.ssPriceContainer || "",
          priceServing: docData.ingredientData.ssPriceServing || "",
          servingContainer: docData.ingredientData.ssServingContainer || "",
          servingSize: docData.ingredientData.ssServingSize || "",
          totalYield: docData.ingredientData.ssTotalYield || "",
          unit: docData.ingredientData.ssUnit || "",
        },
        'Target': {
          brand: docData.ingredientData.tBrand || "",
          calContainer: docData.ingredientData.tCalContainer || "",
          calServing: docData.ingredientData.tCalServing || "",
          link: docData.ingredientData.tLink || "",
          priceContainer: docData.ingredientData.tPriceContainer || "",
          priceServing: docData.ingredientData.tPriceServing || "",
          servingContainer: docData.ingredientData.tServingContainer || "",
          servingSize: docData.ingredientData.tServingSize || "",
          totalYield: docData.ingredientData.tTotalYield || "",
          unit: docData.ingredientData.tUnit || "",
        },
        'Walmart': {
          brand: docData.ingredientData.wBrand || "",
          calContainer: docData.ingredientData.wCalContainer || "",
          calServing: docData.ingredientData.wCalServing || "",
          link: docData.ingredientData.wLink || "",
          priceContainer: docData.ingredientData.wPriceContainer || "",
          priceServing: docData.ingredientData.wPriceServing || "",
          servingContainer: docData.ingredientData.wServingContainer || "",
          servingSize: docData.ingredientData.wServingSize || "",
          totalYield: docData.ingredientData.wTotalYield || "",
          unit: docData.ingredientData.wUnit || "",
        }
      }
      batch.set(doc(db, 'CURRENTS', docSnap.id), docData);
    })

    await batch.commit();
}

const globals = async () => {
const snapshot = await getDocs(collection(db, 'globals'));
const batch = writeBatch(db);

snapshot.forEach(docSnap => {
    let docData = {...docSnap.data()}
    batch.set(doc(db, 'GLOBALS', docSnap.id), docData);
})

await batch.commit();
}

const ingredients = async () => {
const snapshot = await getDocs(collection(db, 'ingredients'));
const batch = writeBatch(db);

let index = 0;
snapshot.forEach(docSnap => {

    let docData = {...docSnap.data()}

    docData = {
    ingredientName: docData.ingredientName || "", 
    ingredientTypes: docData.ingredientType || [],
    ingredientData: {
        'Aldi': {
        brand: docData.aBrand || "",
        calContainer: docData.aCalContainer || "",
        calServing: docData.aCalServing || "",
        link: docData.aLink || "",
        priceContainer: docData.aPriceContainer || "",
        priceServing: docData.aPriceServing || "",
        servingContainer: docData.aServingContainer || "",
        servingSize: docData.aServingSize || "",
        totalYield: docData.aTotalYield || "",
        unit: docData.aUnit || "",
        },
        'MarketBasket': {
        brand: docData.mbBrand || "",
        calContainer: docData.mbCalContainer || "",
        calServing: docData.mbCalServing || "",
        link: docData.mbLink || "",
        priceContainer: docData.mbPriceContainer || "",
        priceServing: docData.mbPriceServing || "",
        servingContainer: docData.mbServingContainer || "",
        servingSize: docData.mbServingSize || "",
        totalYield: docData.mbTotalYield || "",
        unit: docData.mbUnit || "",
        },
        'StarMarket': {
        brand: docData.smBrand || "",
        calContainer: docData.smCalContainer || "",
        calServing: docData.smCalServing || "",
        link: docData.smLink || "",
        priceContainer: docData.smPriceContainer || "",
        priceServing: docData.smPriceServing || "",
        servingContainer: docData.smServingContainer || "",
        servingSize: docData.smServingSize || "",
        totalYield: docData.smTotalYield || "",
        unit: docData.smUnit || "",
        },
        'StopAndShop': {
        brand: docData.ssBrand || "",
        calContainer: docData.ssCalContainer || "",
        calServing: docData.ssCalServing || "",
        link: docData.ssLink || "",
        priceContainer: docData.ssPriceContainer || "",
        priceServing: docData.ssPriceServing || "",
        servingContainer: docData.ssServingContainer || "",
        servingSize: docData.ssServingSize || "",
        totalYield: docData.ssTotalYield || "",
        unit: docData.ssUnit || "",
        },
        'Target': {
        brand: docData.tBrand || "",
        calContainer: docData.tCalContainer || "",
        calServing: docData.tCalServing || "",
        link: docData.tLink || "",
        priceContainer: docData.tPriceContainer || "",
        priceServing: docData.tPriceServing || "",
        servingContainer: docData.tServingContainer || "",
        servingSize: docData.tServingSize || "",
        totalYield: docData.tTotalYield || "",
        unit: docData.tUnit || "",
        },
        'Walmart': {
        brand: docData.wBrand || "",
        calContainer: docData.wCalContainer || "",
        calServing: docData.wCalServing || "",
        link: docData.wLink || "",
        priceContainer: docData.wPriceContainer || "",
        priceServing: docData.wPriceServing || "",
        servingContainer: docData.wServingContainer || "",
        servingSize: docData.wServingSize || "",
        totalYield: docData.wTotalYield || "",
        unit: docData.wUnit || "",
        }
    }
    }
    
    batch.set(doc(db, 'INGREDIENTS', docSnap.id), docData);

    index += 1;
})

await batch.commit();
}  

const plans = async () => {
const snapshot = await getDocs(collection(db, 'plans'));
const batch = writeBatch(db);

snapshot.forEach(docSnap => {
    let docData = {...docSnap.data()}

    for (let i = 0; i < 12; i++) {
    if (docData?.meals?.lunch?.prepData?.currentData?.[i]) {

        docData.meals.lunch.prepData.currentData[i].ingredientName = docData.meals.lunch.prepData.currentData[i].ingredientData.ingredientName || "";
        docData.meals.lunch.prepData.currentData[i].ingredientTypes = docData.meals.lunch.prepData.currentData[i].ingredientData.ingredientType || [];
        docData.meals.lunch.prepData.currentData[i].ingredientStore = docData.meals.lunch.prepData.currentData[i].ingredientStore === "" ? "-" : docData.meals.lunch.prepData.currentData[i].ingredientStore === "a" ? "Aldi" : docData.meals.lunch.prepData.currentData[i].ingredientStore === "mb" ? "MarketBasket" : docData.meals.lunch.prepData.currentData[i].ingredientStore === "sm" ? "StarMarket" : docData.meals.lunch.prepData.currentData[i].ingredientStore === "ss" ? "StopAndShop" : docData.meals.lunch.prepData.currentData[i].ingredientStore === "t" ? "Target" : docData.meals.lunch.prepData.currentData[i].ingredientStore === "w" ? "Walmart" : "-";
        docData.meals.lunch.prepData.currentData[i].ingredientData = {
        '-':  {
            calServing: docData.meals.lunch.prepData.currentData[i].ingredientData.CalServing || "",
            servingSize: docData.meals.lunch.prepData.currentData[i].ingredientData.ServingSize || "",
            unit: docData.meals.lunch.prepData.currentData[i].ingredientData.Unit || "",
        },
        'Aldi': {
            brand: docData.meals.lunch.prepData.currentData[i].ingredientData.aBrand || "",
            calContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.aCalContainer || "",
            calServing: docData.meals.lunch.prepData.currentData[i].ingredientData.aCalServing || "",
            link: docData.meals.lunch.prepData.currentData[i].ingredientData.aLink || "",
            priceContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.aPriceContainer || "",
            priceServing: docData.meals.lunch.prepData.currentData[i].ingredientData.aPriceServing || "",
            servingContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.aServingContainer || "",
            servingSize: docData.meals.lunch.prepData.currentData[i].ingredientData.aServingSize || "",
            totalYield: docData.meals.lunch.prepData.currentData[i].ingredientData.aTotalYield || "",
            unit: docData.meals.lunch.prepData.currentData[i].ingredientData.aUnit || "",
        },
        'MarketBasket': {
            brand: docData.meals.lunch.prepData.currentData[i].ingredientData.mbBrand || "",
            calContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.mbCalContainer || "",
            calServing: docData.meals.lunch.prepData.currentData[i].ingredientData.mbCalServing || "",
            link: docData.meals.lunch.prepData.currentData[i].ingredientData.mbLink || "",
            priceContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.mbPriceContainer || "",
            priceServing: docData.meals.lunch.prepData.currentData[i].ingredientData.mbPriceServing || "",
            servingContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.mbServingContainer || "",
            servingSize: docData.meals.lunch.prepData.currentData[i].ingredientData.mbServingSize || "",
            totalYield: docData.meals.lunch.prepData.currentData[i].ingredientData.mbTotalYield || "",
            unit: docData.meals.lunch.prepData.currentData[i].ingredientData.mbUnit || "",
        },
        'StarMarket': {
            brand: docData.meals.lunch.prepData.currentData[i].ingredientData.smBrand || "",
            calContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.smCalContainer || "",
            calServing: docData.meals.lunch.prepData.currentData[i].ingredientData.smCalServing || "",
            link: docData.meals.lunch.prepData.currentData[i].ingredientData.smLink || "",
            priceContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.smPriceContainer || "",
            priceServing: docData.meals.lunch.prepData.currentData[i].ingredientData.smPriceServing || "",
            servingContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.smServingContainer || "",
            servingSize: docData.meals.lunch.prepData.currentData[i].ingredientData.smServingSize || "",
            totalYield: docData.meals.lunch.prepData.currentData[i].ingredientData.smTotalYield || "",
            unit: docData.meals.lunch.prepData.currentData[i].ingredientData.smUnit || "",
        },
        'StopAndShop': {
            brand: docData.meals.lunch.prepData.currentData[i].ingredientData.ssBrand || "",
            calContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.ssCalContainer || "",
            calServing: docData.meals.lunch.prepData.currentData[i].ingredientData.ssCalServing || "",
            link: docData.meals.lunch.prepData.currentData[i].ingredientData.ssLink || "",
            priceContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.ssPriceContainer || "",
            priceServing: docData.meals.lunch.prepData.currentData[i].ingredientData.ssPriceServing || "",
            servingContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.ssServingContainer || "",
            servingSize: docData.meals.lunch.prepData.currentData[i].ingredientData.ssServingSize || "",
            totalYield: docData.meals.lunch.prepData.currentData[i].ingredientData.ssTotalYield || "",
            unit: docData.meals.lunch.prepData.currentData[i].ingredientData.ssUnit || "",
        },
        'Target': {
            brand: docData.meals.lunch.prepData.currentData[i].ingredientData.tBrand || "",
            calContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.tCalContainer || "",
            calServing: docData.meals.lunch.prepData.currentData[i].ingredientData.tCalServing || "",
            link: docData.meals.lunch.prepData.currentData[i].ingredientData.tLink || "",
            priceContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.tPriceContainer || "",
            priceServing: docData.meals.lunch.prepData.currentData[i].ingredientData.tPriceServing || "",
            servingContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.tServingContainer || "",
            servingSize: docData.meals.lunch.prepData.currentData[i].ingredientData.tServingSize || "",
            totalYield: docData.meals.lunch.prepData.currentData[i].ingredientData.tTotalYield || "",
            unit: docData.meals.lunch.prepData.currentData[i].ingredientData.tUnit || "",
        },
        'Walmart': {
            brand: docData.meals.lunch.prepData.currentData[i].ingredientData.wBrand || "",
            calContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.wCalContainer || "",
            calServing: docData.meals.lunch.prepData.currentData[i].ingredientData.wCalServing || "",
            link: docData.meals.lunch.prepData.currentData[i].ingredientData.wLink || "",
            priceContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.wPriceContainer || "",
            priceServing: docData.meals.lunch.prepData.currentData[i].ingredientData.wPriceServing || "",
            servingContainer: docData.meals.lunch.prepData.currentData[i].ingredientData.wServingContainer || "",
            servingSize: docData.meals.lunch.prepData.currentData[i].ingredientData.wServingSize || "",
            totalYield: docData.meals.lunch.prepData.currentData[i].ingredientData.wTotalYield || "",
            unit: docData.meals.lunch.prepData.currentData[i].ingredientData.wUnit || "",
        }
        }
    }

    if (docData?.meals?.dinner?.prepData?.currentData?.[i]) {
        docData.meals.dinner.prepData.currentData[i].ingredientName = docData.meals.dinner.prepData.currentData[i].ingredientData.ingredientName || "";
        docData.meals.dinner.prepData.currentData[i].ingredientTypes = docData.meals.dinner.prepData.currentData[i].ingredientData.ingredientType || [];
        docData.meals.dinner.prepData.currentData[i].ingredientStore = docData.meals.dinner.prepData.currentData[i].ingredientStore === "" ? "-" : docData.meals.dinner.prepData.currentData[i].ingredientStore === "a" ? "Aldi" : docData.meals.dinner.prepData.currentData[i].ingredientStore === "mb" ? "MarketBasket" : docData.meals.dinner.prepData.currentData[i].ingredientStore === "sm" ? "StarMarket" : docData.meals.dinner.prepData.currentData[i].ingredientStore === "ss" ? "StopAndShop" : docData.meals.dinner.prepData.currentData[i].ingredientStore === "t" ? "Target" : docData.meals.dinner.prepData.currentData[i].ingredientStore === "w" ? "Walmart" : "-";
        docData.meals.dinner.prepData.currentData[i].ingredientData = {
        '-':  {
            calServing: docData.meals.dinner.prepData.currentData[i].ingredientData.CalServing || "",
            servingSize: docData.meals.dinner.prepData.currentData[i].ingredientData.ServingSize || "",
            unit: docData.meals.dinner.prepData.currentData[i].ingredientData.Unit || "",
        },
        'Aldi': {
            brand: docData.meals.dinner.prepData.currentData[i].ingredientData.aBrand || "",
            calContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.aCalContainer || "",
            calServing: docData.meals.dinner.prepData.currentData[i].ingredientData.aCalServing || "",
            link: docData.meals.dinner.prepData.currentData[i].ingredientData.aLink || "",
            priceContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.aPriceContainer || "",
            priceServing: docData.meals.dinner.prepData.currentData[i].ingredientData.aPriceServing || "",
            servingContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.aServingContainer || "",
            servingSize: docData.meals.dinner.prepData.currentData[i].ingredientData.aServingSize || "",
            totalYield: docData.meals.dinner.prepData.currentData[i].ingredientData.aTotalYield || "",
            unit: docData.meals.dinner.prepData.currentData[i].ingredientData.aUnit || "",
        },
        'MarketBasket': {
            brand: docData.meals.dinner.prepData.currentData[i].ingredientData.mbBrand || "",
            calContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.mbCalContainer || "",
            calServing: docData.meals.dinner.prepData.currentData[i].ingredientData.mbCalServing || "",
            link: docData.meals.dinner.prepData.currentData[i].ingredientData.mbLink || "",
            priceContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.mbPriceContainer || "",
            priceServing: docData.meals.dinner.prepData.currentData[i].ingredientData.mbPriceServing || "",
            servingContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.mbServingContainer || "",
            servingSize: docData.meals.dinner.prepData.currentData[i].ingredientData.mbServingSize || "",
            totalYield: docData.meals.dinner.prepData.currentData[i].ingredientData.mbTotalYield || "",
            unit: docData.meals.dinner.prepData.currentData[i].ingredientData.mbUnit || "",
        },
        'StarMarket': {
            brand: docData.meals.dinner.prepData.currentData[i].ingredientData.smBrand || "",
            calContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.smCalContainer || "",
            calServing: docData.meals.dinner.prepData.currentData[i].ingredientData.smCalServing || "",
            link: docData.meals.dinner.prepData.currentData[i].ingredientData.smLink || "",
            priceContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.smPriceContainer || "",
            priceServing: docData.meals.dinner.prepData.currentData[i].ingredientData.smPriceServing || "",
            servingContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.smServingContainer || "",
            servingSize: docData.meals.dinner.prepData.currentData[i].ingredientData.smServingSize || "",
            totalYield: docData.meals.dinner.prepData.currentData[i].ingredientData.smTotalYield || "",
            unit: docData.meals.dinner.prepData.currentData[i].ingredientData.smUnit || "",
        },
        'StopAndShop': {
            brand: docData.meals.dinner.prepData.currentData[i].ingredientData.ssBrand || "",
            calContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.ssCalContainer || "",
            calServing: docData.meals.dinner.prepData.currentData[i].ingredientData.ssCalServing || "",
            link: docData.meals.dinner.prepData.currentData[i].ingredientData.ssLink || "",
            priceContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.ssPriceContainer || "",
            priceServing: docData.meals.dinner.prepData.currentData[i].ingredientData.ssPriceServing || "",
            servingContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.ssServingContainer || "",
            servingSize: docData.meals.dinner.prepData.currentData[i].ingredientData.ssServingSize || "",
            totalYield: docData.meals.dinner.prepData.currentData[i].ingredientData.ssTotalYield || "",
            unit: docData.meals.dinner.prepData.currentData[i].ingredientData.ssUnit || "",
        },
        'Target': {
            brand: docData.meals.dinner.prepData.currentData[i].ingredientData.tBrand || "",
            calContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.tCalContainer || "",
            calServing: docData.meals.dinner.prepData.currentData[i].ingredientData.tCalServing || "",
            link: docData.meals.dinner.prepData.currentData[i].ingredientData.tLink || "",
            priceContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.tPriceContainer || "",
            priceServing: docData.meals.dinner.prepData.currentData[i].ingredientData.tPriceServing || "",
            servingContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.tServingContainer || "",
            servingSize: docData.meals.dinner.prepData.currentData[i].ingredientData.tServingSize || "",
            totalYield: docData.meals.dinner.prepData.currentData[i].ingredientData.tTotalYield || "",
            unit: docData.meals.dinner.prepData.currentData[i].ingredientData.tUnit || "",
        },
        'Walmart': {
            brand: docData.meals.dinner.prepData.currentData[i].ingredientData.wBrand || "",
            calContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.wCalContainer || "",
            calServing: docData.meals.dinner.prepData.currentData[i].ingredientData.wCalServing || "",
            link: docData.meals.dinner.prepData.currentData[i].ingredientData.wLink || "",
            priceContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.wPriceContainer || "",
            priceServing: docData.meals.dinner.prepData.currentData[i].ingredientData.wPriceServing || "",
            servingContainer: docData.meals.dinner.prepData.currentData[i].ingredientData.wServingContainer || "",
            servingSize: docData.meals.dinner.prepData.currentData[i].ingredientData.wServingSize || "",
            totalYield: docData.meals.dinner.prepData.currentData[i].ingredientData.wTotalYield || "",
            unit: docData.meals.dinner.prepData.currentData[i].ingredientData.wUnit || "",
        }
        }
    }
    }

    batch.set(doc(db, 'PLANS', docSnap.id), docData);
})

await batch.commit();
}

const preps = async () => {
const snapshot = await getDocs(collection(db, 'preps'));
const batch = writeBatch(db);

snapshot.forEach(docSnap => {
    let docData = {...docSnap.data()}

    for (let i = 0; i < 12; i++) {
    if (docData?.currentData?.[i]) {

        docData.currentData[i].ingredientName = docData.currentData[i].ingredientData.ingredientName || ""; 
        docData.currentData[i].ingredientTypes = docData.currentData[i].ingredientData.ingredientType || [];
        docData.currentData[i].ingredientStore = docData.currentData[i].ingredientStore === "" ? "-" : docData.currentData[i].ingredientStore === "a" ? "Aldi" : docData.currentData[i].ingredientStore === "mb" ? "MarketBasket" : docData.currentData[i].ingredientStore === "sm" ? "StarMarket" : docData.currentData[i].ingredientStore === "ss" ? "StopAndShop" : docData.currentData[i].ingredientStore === "t" ? "Target" : docData.currentData[i].ingredientStore === "w" ? "Walmart" : "-";
        docData.currentData[i].ingredientData = {
        '-':  {
            calServing: docData.currentData[i].ingredientData.CalServing || "",
            servingSize: docData.currentData[i].ingredientData.ServingSize || "",
            unit: docData.currentData[i].ingredientData.Unit || "",
        },
        'Aldi': {
            brand: docData.currentData[i].ingredientData.aBrand || "",
            calContainer: docData.currentData[i].ingredientData.aCalContainer || "",
            calServing: docData.currentData[i].ingredientData.aCalServing || "",
            link: docData.currentData[i].ingredientData.aLink || "",
            priceContainer: docData.currentData[i].ingredientData.aPriceContainer || "",
            priceServing: docData.currentData[i].ingredientData.aPriceServing || "",
            servingContainer: docData.currentData[i].ingredientData.aServingContainer || "",
            servingSize: docData.currentData[i].ingredientData.aServingSize || "",
            totalYield: docData.currentData[i].ingredientData.aTotalYield || "",
            unit: docData.currentData[i].ingredientData.aUnit || "",
        },
        'MarketBasket': {
            brand: docData.currentData[i].ingredientData.mbBrand || "",
            calContainer: docData.currentData[i].ingredientData.mbCalContainer || "",
            calServing: docData.currentData[i].ingredientData.mbCalServing || "",
            link: docData.currentData[i].ingredientData.mbLink || "",
            priceContainer: docData.currentData[i].ingredientData.mbPriceContainer || "",
            priceServing: docData.currentData[i].ingredientData.mbPriceServing || "",
            servingContainer: docData.currentData[i].ingredientData.mbServingContainer || "",
            servingSize: docData.currentData[i].ingredientData.mbServingSize || "",
            totalYield: docData.currentData[i].ingredientData.mbTotalYield || "",
            unit: docData.currentData[i].ingredientData.mbUnit || "",
        },
        'StarMarket': {
            brand: docData.currentData[i].ingredientData.smBrand || "",
            calContainer: docData.currentData[i].ingredientData.smCalContainer || "",
            calServing: docData.currentData[i].ingredientData.smCalServing || "",
            link: docData.currentData[i].ingredientData.smLink || "",
            priceContainer: docData.currentData[i].ingredientData.smPriceContainer || "",
            priceServing: docData.currentData[i].ingredientData.smPriceServing || "",
            servingContainer: docData.currentData[i].ingredientData.smServingContainer || "",
            servingSize: docData.currentData[i].ingredientData.smServingSize || "",
            totalYield: docData.currentData[i].ingredientData.smTotalYield || "",
            unit: docData.currentData[i].ingredientData.smUnit || "",
        },
        'StopAndShop': {
            brand: docData.currentData[i].ingredientData.ssBrand || "",
            calContainer: docData.currentData[i].ingredientData.ssCalContainer || "",
            calServing: docData.currentData[i].ingredientData.ssCalServing || "",
            link: docData.currentData[i].ingredientData.ssLink || "",
            priceContainer: docData.currentData[i].ingredientData.ssPriceContainer || "",
            priceServing: docData.currentData[i].ingredientData.ssPriceServing || "",
            servingContainer: docData.currentData[i].ingredientData.ssServingContainer || "",
            servingSize: docData.currentData[i].ingredientData.ssServingSize || "",
            totalYield: docData.currentData[i].ingredientData.ssTotalYield || "",
            unit: docData.currentData[i].ingredientData.ssUnit || "",
        },
        'Target': {
            brand: docData.currentData[i].ingredientData.tBrand || "",
            calContainer: docData.currentData[i].ingredientData.tCalContainer || "",
            calServing: docData.currentData[i].ingredientData.tCalServing || "",
            link: docData.currentData[i].ingredientData.tLink || "",
            priceContainer: docData.currentData[i].ingredientData.tPriceContainer || "",
            priceServing: docData.currentData[i].ingredientData.tPriceServing || "",
            servingContainer: docData.currentData[i].ingredientData.tServingContainer || "",
            servingSize: docData.currentData[i].ingredientData.tServingSize || "",
            totalYield: docData.currentData[i].ingredientData.tTotalYield || "",
            unit: docData.currentData[i].ingredientData.tUnit || "",
        },
        'Walmart': {
            brand: docData.currentData[i].ingredientData.wBrand || "",
            calContainer: docData.currentData[i].ingredientData.wCalContainer || "",
            calServing: docData.currentData[i].ingredientData.wCalServing || "",
            link: docData.currentData[i].ingredientData.wLink || "",
            priceContainer: docData.currentData[i].ingredientData.wPriceContainer || "",
            priceServing: docData.currentData[i].ingredientData.wPriceServing || "",
            servingContainer: docData.currentData[i].ingredientData.wServingContainer || "",
            servingSize: docData.currentData[i].ingredientData.wServingSize || "",
            totalYield: docData.currentData[i].ingredientData.wTotalYield || "",
            unit: docData.currentData[i].ingredientData.wUnit || "",
        }
        }
    }
    }

    batch.set(doc(db, 'PREPS', docSnap.id), docData);
})

await batch.commit();
}

const recipes = async () => {
const snapshot = await getDocs(collection(db, 'recipes'));
const batch = writeBatch(db);

snapshot.forEach(docSnap => {
    let docData = {...docSnap.data()}

    docData.ingredientNames = ["", "", "", "", "", "", "", "", "", "", "", ""];
    docData.ingredientTypes = {0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: []};

    for (let i = 0; i < 12; i++) {
    
    if (docData?.ingredientData?.[i]) {
        docData.ingredientNames[i] = docData.ingredientData[i].ingredientName || "";
        docData.ingredientTypes[i] = docData.ingredientData[i].ingredientType || "";
        docData.ingredientStores[i] = docData.ingredientStores[i] === "" ? "-" : docData.ingredientStores[i] === "a" ? "Aldi" : docData.ingredientStores[i] === "mb" ? "MarketBasket" : docData.ingredientStores[i] === "sm" ? "StarMarket" : docData.ingredientStores[i] === "ss" ? "StopAndShop" : docData.ingredientStores[i] === "t" ? "Target" : docData.ingredientStores[i] === "w" ? "Walmart" : "-";
        docData.ingredientData[i] = {
        'Aldi': {
            brand: docData.ingredientData[i].aBrand || "",
            calContainer: docData.ingredientData[i].aCalContainer || "",
            calServing: docData.ingredientData[i].aCalServing || "",
            link: docData.ingredientData[i].aLink || "",
            priceContainer: docData.ingredientData[i].aPriceContainer || "",
            priceServing: docData.ingredientData[i].aPriceServing || "",
            servingContainer: docData.ingredientData[i].aServingContainer || "",
            servingSize: docData.ingredientData[i].aServingSize || "",
            totalYield: docData.ingredientData[i].aTotalYield || "",
            unit: docData.ingredientData[i].aUnit || "",
        },
        'MarketBasket': {
            brand: docData.ingredientData[i].mbBrand || "",
            calContainer: docData.ingredientData[i].mbCalContainer || "",
            calServing: docData.ingredientData[i].mbCalServing || "",
            link: docData.ingredientData[i].mbLink || "",
            priceContainer: docData.ingredientData[i].mbPriceContainer || "",
            priceServing: docData.ingredientData[i].mbPriceServing || "",
            servingContainer: docData.ingredientData[i].mbServingContainer || "",
            servingSize: docData.ingredientData[i].mbServingSize || "",
            totalYield: docData.ingredientData[i].mbTotalYield || "",
            unit: docData.ingredientData[i].mbUnit || "",
        },
        'StarMarket': {
            brand: docData.ingredientData[i].smBrand || "",
            calContainer: docData.ingredientData[i].smCalContainer || "",
            calServing: docData.ingredientData[i].smCalServing || "",
            link: docData.ingredientData[i].smLink || "",
            priceContainer: docData.ingredientData[i].smPriceContainer || "",
            priceServing: docData.ingredientData[i].smPriceServing || "",
            servingContainer: docData.ingredientData[i].smServingContainer || "",
            servingSize: docData.ingredientData[i].smServingSize || "",
            totalYield: docData.ingredientData[i].smTotalYield || "",
            unit: docData.ingredientData[i].smUnit || "",
        },
        'StopAndShop': {
            brand: docData.ingredientData[i].ssBrand || "",
            calContainer: docData.ingredientData[i].ssCalContainer || "",
            calServing: docData.ingredientData[i].ssCalServing || "",
            link: docData.ingredientData[i].ssLink || "",
            priceContainer: docData.ingredientData[i].ssPriceContainer || "",
            priceServing: docData.ingredientData[i].ssPriceServing || "",
            servingContainer: docData.ingredientData[i].ssServingContainer || "",
            servingSize: docData.ingredientData[i].ssServingSize || "",
            totalYield: docData.ingredientData[i].ssTotalYield || "",
            unit: docData.ingredientData[i].ssUnit || "",
        },
        'Target': {
            brand: docData.ingredientData[i].tBrand || "",
            calContainer: docData.ingredientData[i].tCalContainer || "",
            calServing: docData.ingredientData[i].tCalServing || "",
            link: docData.ingredientData[i].tLink || "",
            priceContainer: docData.ingredientData[i].tPriceContainer || "",
            priceServing: docData.ingredientData[i].tPriceServing || "",
            servingContainer: docData.ingredientData[i].tServingContainer || "",
            servingSize: docData.ingredientData[i].tServingSize || "",
            totalYield: docData.ingredientData[i].tTotalYield || "",
            unit: docData.ingredientData[i].tUnit || "",
        },
        'Walmart': {
            brand: docData.ingredientData[i].wBrand || "",
            calContainer: docData.ingredientData[i].wCalContainer || "",
            calServing: docData.ingredientData[i].wCalServing || "",
            link: docData.ingredientData[i].wLink || "",
            priceContainer: docData.ingredientData[i].wPriceContainer || "",
            priceServing: docData.ingredientData[i].wPriceServing || "",
            servingContainer: docData.ingredientData[i].wServingContainer || "",
            servingSize: docData.ingredientData[i].wServingSize || "",
            totalYield: docData.ingredientData[i].wTotalYield || "",
            unit: docData.ingredientData[i].wUnit || "",
        }
        }
    }
    }
    
    batch.set(doc(db, 'RECIPES', docSnap.id), docData);
})

await batch.commit();
}

const shopping = async () => {
const snapshot = await getDocs(collection(db, 'shopping'));
const batch = writeBatch(db);

snapshot.forEach(docSnap => {
    let docData = {...docSnap.data()}
    batch.set(doc(db, 'SHOPPING', docSnap.id), docData);
})

await batch.commit();
}

const spotlights = async () => {
const snapshot = await getDocs(collection(db, 'spotlights'));
const batch = writeBatch(db);

snapshot.forEach(docSnap => {
    let docData = {...docSnap.data()}

    docData.ingredientNames = ["", "", "", "", "", "", "", "", "", "", "", ""];
    docData.ingredientTypes = {0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: []};

    for (let i = 0; i < 12; i++) {
    
    if (docData?.ingredientData?.[i]) {
        docData.ingredientNames[i] = docData.ingredientData[i].ingredientName || "";
        docData.ingredientTypes[i] = docData.ingredientData[i].ingredientType || "";
        docData.ingredientStores[i] = docData.ingredientStores[i] === "" ? "-" : docData.ingredientStores[i] === "a" ? "Aldi" : docData.ingredientStores[i] === "mb" ? "MarketBasket" : docData.ingredientStores[i] === "sm" ? "StarMarket" : docData.ingredientStores[i] === "ss" ? "StopAndShop" : docData.ingredientStores[i] === "t" ? "Target" : docData.ingredientStores[i] === "w" ? "Walmart" : "-";
        docData.ingredientData[i] = {
        'Aldi': {
            brand: docData.ingredientData[i].aBrand || "",
            calContainer: docData.ingredientData[i].aCalContainer || "",
            calServing: docData.ingredientData[i].aCalServing || "",
            link: docData.ingredientData[i].aLink || "",
            priceContainer: docData.ingredientData[i].aPriceContainer || "",
            priceServing: docData.ingredientData[i].aPriceServing || "",
            servingContainer: docData.ingredientData[i].aServingContainer || "",
            servingSize: docData.ingredientData[i].aServingSize || "",
            totalYield: docData.ingredientData[i].aTotalYield || "",
            unit: docData.ingredientData[i].aUnit || "",
        },
        'MarketBasket': {
            brand: docData.ingredientData[i].mbBrand || "",
            calContainer: docData.ingredientData[i].mbCalContainer || "",
            calServing: docData.ingredientData[i].mbCalServing || "",
            link: docData.ingredientData[i].mbLink || "",
            priceContainer: docData.ingredientData[i].mbPriceContainer || "",
            priceServing: docData.ingredientData[i].mbPriceServing || "",
            servingContainer: docData.ingredientData[i].mbServingContainer || "",
            servingSize: docData.ingredientData[i].mbServingSize || "",
            totalYield: docData.ingredientData[i].mbTotalYield || "",
            unit: docData.ingredientData[i].mbUnit || "",
        },
        'StarMarket': {
            brand: docData.ingredientData[i].smBrand || "",
            calContainer: docData.ingredientData[i].smCalContainer || "",
            calServing: docData.ingredientData[i].smCalServing || "",
            link: docData.ingredientData[i].smLink || "",
            priceContainer: docData.ingredientData[i].smPriceContainer || "",
            priceServing: docData.ingredientData[i].smPriceServing || "",
            servingContainer: docData.ingredientData[i].smServingContainer || "",
            servingSize: docData.ingredientData[i].smServingSize || "",
            totalYield: docData.ingredientData[i].smTotalYield || "",
            unit: docData.ingredientData[i].smUnit || "",
        },
        'StopAndShop': {
            brand: docData.ingredientData[i].ssBrand || "",
            calContainer: docData.ingredientData[i].ssCalContainer || "",
            calServing: docData.ingredientData[i].ssCalServing || "",
            link: docData.ingredientData[i].ssLink || "",
            priceContainer: docData.ingredientData[i].ssPriceContainer || "",
            priceServing: docData.ingredientData[i].ssPriceServing || "",
            servingContainer: docData.ingredientData[i].ssServingContainer || "",
            servingSize: docData.ingredientData[i].ssServingSize || "",
            totalYield: docData.ingredientData[i].ssTotalYield || "",
            unit: docData.ingredientData[i].ssUnit || "",
        },
        'Target': {
            brand: docData.ingredientData[i].tBrand || "",
            calContainer: docData.ingredientData[i].tCalContainer || "",
            calServing: docData.ingredientData[i].tCalServing || "",
            link: docData.ingredientData[i].tLink || "",
            priceContainer: docData.ingredientData[i].tPriceContainer || "",
            priceServing: docData.ingredientData[i].tPriceServing || "",
            servingContainer: docData.ingredientData[i].tServingContainer || "",
            servingSize: docData.ingredientData[i].tServingSize || "",
            totalYield: docData.ingredientData[i].tTotalYield || "",
            unit: docData.ingredientData[i].tUnit || "",
        },
        'Walmart': {
            brand: docData.ingredientData[i].wBrand || "",
            calContainer: docData.ingredientData[i].wCalContainer || "",
            calServing: docData.ingredientData[i].wCalServing || "",
            link: docData.ingredientData[i].wLink || "",
            priceContainer: docData.ingredientData[i].wPriceContainer || "",
            priceServing: docData.ingredientData[i].wPriceServing || "",
            servingContainer: docData.ingredientData[i].wServingContainer || "",
            servingSize: docData.ingredientData[i].wServingSize || "",
            totalYield: docData.ingredientData[i].wTotalYield || "",
            unit: docData.ingredientData[i].wUnit || "",
        }
        }
    }
    }
    
    batch.set(doc(db, 'SPOTLIGHTS', docSnap.id), docData);
})

await batch.commit();
}
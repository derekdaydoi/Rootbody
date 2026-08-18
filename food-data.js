(() => {
  "use strict";

  const foods = [
    { id: "rice", name: "Cơm trắng", category: "Tinh bột", serving: "1 bát vừa · 180 g", kcal: 250, protein: 5, low: 220, high: 280, confidence: "high", keywords: "com gao", allowCooking: false },
    { id: "brown_rice", name: "Cơm gạo lứt", category: "Tinh bột", serving: "1 bát vừa · 180 g", kcal: 220, protein: 5, low: 195, high: 250, confidence: "high", keywords: "com gao lut", allowCooking: false },
    { id: "sticky_rice", name: "Xôi trắng", category: "Tinh bột", serving: "1 gói vừa · 200 g", kcal: 420, protein: 8, low: 360, high: 500, confidence: "medium", keywords: "xoi nep", allowCooking: false },
    { id: "bread", name: "Bánh mì không", category: "Tinh bột", serving: "1 ổ · 90 g", kcal: 250, protein: 8, low: 220, high: 285, confidence: "high", keywords: "banh mi o", allowCooking: false },
    { id: "bun", name: "Bún tươi", category: "Tinh bột", serving: "1 phần · 200 g", kcal: 225, protein: 4, low: 200, high: 255, confidence: "high", keywords: "bun tuoi", allowCooking: false },
    { id: "pho_noodle", name: "Bánh phở", category: "Tinh bột", serving: "1 phần · 200 g", kcal: 280, protein: 6, low: 245, high: 320, confidence: "high", keywords: "banh pho tuoi", allowCooking: false },
    { id: "sweet_potato", name: "Khoai lang", category: "Tinh bột", serving: "1 củ vừa · 200 g", kcal: 220, protein: 3, low: 190, high: 250, confidence: "high", keywords: "khoai lang luoc", allowCooking: false },
    { id: "potato", name: "Khoai tây", category: "Tinh bột", serving: "200 g", kcal: 190, protein: 4, low: 170, high: 215, confidence: "high", keywords: "khoai tay", allowCooking: true },
    { id: "oats", name: "Yến mạch", category: "Tinh bột", serving: "50 g khô", kcal: 195, protein: 8, low: 185, high: 210, confidence: "high", keywords: "yen mach oat", allowCooking: false },
    { id: "boiled_egg", name: "Trứng luộc", category: "Đạm", serving: "1 quả", kcal: 80, protein: 6, low: 70, high: 90, confidence: "high", keywords: "trung ga luoc", allowCooking: false },
    { id: "fried_egg", name: "Trứng chiên", category: "Đạm", serving: "1 quả", kcal: 120, protein: 6, low: 95, high: 150, confidence: "medium", keywords: "trung ran op la", allowCooking: false },
    { id: "chicken_breast", name: "Ức gà chín", category: "Đạm", serving: "100 g", kcal: 170, protein: 31, low: 155, high: 195, confidence: "high", keywords: "uc ga ap chao luoc", allowCooking: true },
    { id: "chicken_thigh", name: "Đùi gà chín", category: "Đạm", serving: "100 g", kcal: 220, protein: 25, low: 190, high: 270, confidence: "medium", keywords: "dui ga da", allowCooking: true },
    { id: "lean_beef", name: "Thịt bò nạc chín", category: "Đạm", serving: "100 g", kcal: 250, protein: 27, low: 220, high: 290, confidence: "medium", keywords: "bo nac ap chao luoc", allowCooking: true },
    { id: "stir_beef", name: "Thịt bò xào", category: "Đạm", serving: "1 đĩa vừa", kcal: 400, protein: 30, low: 320, high: 500, confidence: "low", keywords: "bo xao rau", allowCooking: false },
    { id: "lean_pork", name: "Thịt lợn nạc chín", category: "Đạm", serving: "100 g", kcal: 240, protein: 27, low: 210, high: 285, confidence: "medium", keywords: "thit heo lon nac luoc", allowCooking: true },
    { id: "pork_belly", name: "Thịt ba chỉ", category: "Đạm", serving: "100 g", kcal: 500, protein: 18, low: 430, high: 580, confidence: "medium", keywords: "ba roi thit lon heo", allowCooking: true },
    { id: "minced_pork", name: "Thịt lợn băm chín", category: "Đạm", serving: "100 g", kcal: 300, protein: 24, low: 250, high: 360, confidence: "medium", keywords: "thit heo bam xay", allowCooking: true },
    { id: "white_fish", name: "Cá trắng chín", category: "Đạm", serving: "150 g", kcal: 220, protein: 34, low: 185, high: 270, confidence: "medium", keywords: "ca hap luoc ap chao", allowCooking: true },
    { id: "salmon", name: "Cá hồi chín", category: "Đạm", serving: "150 g", kcal: 320, protein: 33, low: 285, high: 370, confidence: "medium", keywords: "ca hoi ap chao", allowCooking: true },
    { id: "shrimp", name: "Tôm chín", category: "Đạm", serving: "150 g", kcal: 180, protein: 36, low: 160, high: 210, confidence: "high", keywords: "tom luoc hap", allowCooking: true },
    { id: "tofu", name: "Đậu phụ", category: "Đạm", serving: "200 g", kcal: 180, protein: 18, low: 150, high: 230, confidence: "medium", keywords: "dau hu phu", allowCooking: true },
    { id: "tuna", name: "Cá ngừ hộp ngâm nước", category: "Đạm", serving: "1 hộp ráo nước · 140 g", kcal: 170, protein: 35, low: 150, high: 210, confidence: "high", keywords: "ca ngu hop", allowCooking: false },
    { id: "plain_yogurt", name: "Sữa chua không đường", category: "Sữa", serving: "1 hộp · 100 g", kcal: 70, protein: 4, low: 60, high: 85, confidence: "high", keywords: "sua chua", allowCooking: false },
    { id: "greek_yogurt", name: "Sữa chua Hy Lạp", category: "Sữa", serving: "1 hộp · 150 g", kcal: 130, protein: 15, low: 100, high: 170, confidence: "medium", keywords: "greek yogurt sua chua hy lap", allowCooking: false },
    { id: "milk", name: "Sữa tươi không đường", category: "Sữa", serving: "250 ml", kcal: 130, protein: 8, low: 110, high: 155, confidence: "high", keywords: "sua tuoi", allowCooking: false },
    { id: "boiled_veg", name: "Rau luộc", category: "Rau", serving: "1 đĩa · 250 g", kcal: 80, protein: 5, low: 55, high: 110, confidence: "medium", keywords: "rau cu luoc", allowCooking: false },
    { id: "stir_veg", name: "Rau xào", category: "Rau", serving: "1 đĩa · 250 g", kcal: 200, protein: 5, low: 130, high: 300, confidence: "low", keywords: "rau xao dau", allowCooking: false },
    { id: "salad", name: "Salad rau", category: "Rau", serving: "1 tô · không sốt béo", kcal: 100, protein: 4, low: 65, high: 160, confidence: "medium", keywords: "xa lach rau tron", allowCooking: false },
    { id: "mushroom", name: "Nấm chín", category: "Rau", serving: "200 g", kcal: 70, protein: 7, low: 55, high: 95, confidence: "high", keywords: "nam", allowCooking: true },
    { id: "pho_beef", name: "Phở bò", category: "Món hoàn chỉnh", serving: "1 bát vừa", kcal: 520, protein: 28, low: 430, high: 680, confidence: "low", keywords: "pho bo tai chin", allowCooking: false },
    { id: "pho_chicken", name: "Phở gà", category: "Món hoàn chỉnh", serving: "1 bát vừa", kcal: 480, protein: 28, low: 400, high: 620, confidence: "low", keywords: "pho ga", allowCooking: false },
    { id: "bun_cha", name: "Bún chả", category: "Món hoàn chỉnh", serving: "1 suất", kcal: 620, protein: 30, low: 500, high: 800, confidence: "low", keywords: "bun cha ha noi", allowCooking: false },
    { id: "bun_bo", name: "Bún bò Huế", category: "Món hoàn chỉnh", serving: "1 bát vừa", kcal: 600, protein: 30, low: 480, high: 780, confidence: "low", keywords: "bun bo hue", allowCooking: false },
    { id: "com_tam", name: "Cơm tấm sườn", category: "Món hoàn chỉnh", serving: "1 đĩa", kcal: 750, protein: 35, low: 620, high: 950, confidence: "low", keywords: "com tam suon bi cha", allowCooking: false },
    { id: "chicken_rice", name: "Cơm gà", category: "Món hoàn chỉnh", serving: "1 đĩa", kcal: 650, protein: 35, low: 520, high: 820, confidence: "low", keywords: "com ga", allowCooking: false },
    { id: "fried_rice", name: "Cơm rang", category: "Món hoàn chỉnh", serving: "1 đĩa", kcal: 700, protein: 22, low: 560, high: 900, confidence: "low", keywords: "com chien duong chau", allowCooking: false },
    { id: "hu_tieu", name: "Hủ tiếu", category: "Món hoàn chỉnh", serving: "1 bát vừa", kcal: 520, protein: 25, low: 420, high: 680, confidence: "low", keywords: "hu tieu nam vang", allowCooking: false },
    { id: "banh_cuon", name: "Bánh cuốn", category: "Món hoàn chỉnh", serving: "1 đĩa", kcal: 480, protein: 18, low: 390, high: 620, confidence: "low", keywords: "banh cuon cha", allowCooking: false },
    { id: "banh_xeo", name: "Bánh xèo", category: "Món hoàn chỉnh", serving: "1 cái lớn", kcal: 500, protein: 18, low: 400, high: 700, confidence: "low", keywords: "banh xeo", allowCooking: false },
    { id: "banh_mi_meat", name: "Bánh mì thịt", category: "Món hoàn chỉnh", serving: "1 ổ", kcal: 520, protein: 22, low: 420, high: 680, confidence: "low", keywords: "banh mi pate thit", allowCooking: false },
    { id: "instant_noodle", name: "Mì ăn liền", category: "Món hoàn chỉnh", serving: "1 gói", kcal: 450, protein: 9, low: 400, high: 520, confidence: "high", keywords: "mi tom hao hao", allowCooking: false },
    { id: "milk_coffee", name: "Cà phê sữa", category: "Đồ uống", serving: "1 ly", kcal: 100, protein: 2, low: 80, high: 160, confidence: "medium", keywords: "ca phe sua da", allowCooking: false },
    { id: "black_coffee", name: "Cà phê đen không đường", category: "Đồ uống", serving: "1 ly", kcal: 10, protein: 0, low: 0, high: 15, confidence: "high", keywords: "ca phe den", allowCooking: false },
    { id: "sugarcane", name: "Nước mía", category: "Đồ uống", serving: "1 ly · 400 ml", kcal: 300, protein: 0, low: 240, high: 380, confidence: "low", keywords: "nuoc mia", allowCooking: false },
    { id: "milk_tea", name: "Trà sữa", category: "Đồ uống", serving: "1 cốc vừa", kcal: 500, protein: 5, low: 350, high: 750, confidence: "low", keywords: "tra sua tran chau", allowCooking: false },
    { id: "soft_drink", name: "Nước ngọt", category: "Đồ uống", serving: "1 lon · 330 ml", kcal: 140, protein: 0, low: 130, high: 160, confidence: "high", keywords: "coca pepsi nuoc ngot", allowCooking: false },
    { id: "beer", name: "Bia", category: "Đồ uống", serving: "1 lon · 330 ml", kcal: 150, protein: 1, low: 130, high: 190, confidence: "high", keywords: "bia lon", allowCooking: false },
    { id: "banana", name: "Chuối", category: "Trái cây", serving: "1 quả vừa", kcal: 105, protein: 1, low: 90, high: 125, confidence: "high", keywords: "chuoi", allowCooking: false },
    { id: "apple", name: "Táo", category: "Trái cây", serving: "1 quả vừa", kcal: 95, protein: 1, low: 75, high: 120, confidence: "high", keywords: "tao", allowCooking: false },
    { id: "orange", name: "Cam", category: "Trái cây", serving: "1 quả vừa", kcal: 70, protein: 1, low: 55, high: 90, confidence: "high", keywords: "cam", allowCooking: false },
    { id: "dragon_fruit", name: "Thanh long", category: "Trái cây", serving: "300 g phần ăn được", kcal: 170, protein: 3, low: 145, high: 200, confidence: "high", keywords: "thanh long", allowCooking: false },
    { id: "avocado", name: "Bơ", category: "Trái cây", serving: "1/2 quả · 100 g", kcal: 160, protein: 2, low: 140, high: 190, confidence: "high", keywords: "qua bo avocado", allowCooking: false },
    { id: "peanuts", name: "Lạc rang", category: "Ăn vặt", serving: "30 g", kcal: 180, protein: 8, low: 165, high: 200, confidence: "high", keywords: "lac dau phong", allowCooking: false },
    { id: "almonds", name: "Hạnh nhân", category: "Ăn vặt", serving: "30 g", kcal: 175, protein: 6, low: 160, high: 195, confidence: "high", keywords: "hanh nhan", allowCooking: false },
    { id: "whey", name: "Whey protein", category: "Đạm", serving: "1 scoop theo nhãn", kcal: 130, protein: 24, low: 110, high: 160, confidence: "high", keywords: "whey protein bot dam", allowCooking: false },
    { id: "cooking_oil", name: "Dầu ăn / sốt béo", category: "Gia vị", serving: "1 thìa canh · 14 g", kcal: 125, protein: 0, low: 115, high: 140, confidence: "high", keywords: "dau an sot", allowCooking: false }
  ];

  const cookingMethods = {
    as_served: { name: "Theo khẩu phần mô tả", kcal: 0, low: 0, high: 0 },
    boiled: { name: "Luộc / hấp", kcal: 0, low: 0, high: 10 },
    pan_light: { name: "Áp chảo ít dầu", kcal: 50, low: 35, high: 80 },
    stir_light: { name: "Xào ít dầu", kcal: 80, low: 55, high: 120 },
    stir_heavy: { name: "Xào nhiều dầu / sốt", kcal: 150, low: 100, high: 230 },
    fried: { name: "Chiên ngập hoặc nhiều dầu", kcal: 200, low: 140, high: 300 }
  };

  const mealTemplates = [
    { id: "chicken_rice_bowl", name: "Cơm ức gà & rau", description: "Nhiều protein, lượng dầu có thể kiểm soát.", items: [{ id: "rice", amount: 1 }, { id: "chicken_breast", amount: 1.5 }, { id: "boiled_veg", amount: 1 }] },
    { id: "fish_rice_bowl", name: "Cơm cá & rau", description: "Bữa chính cân bằng, no lâu.", items: [{ id: "rice", amount: 1 }, { id: "white_fish", amount: 1 }, { id: "boiled_veg", amount: 1 }] },
    { id: "beef_rice_bowl", name: "Cơm bò & rau", description: "Giữ phần bò rõ ràng để giảm sai số.", items: [{ id: "rice", amount: 1 }, { id: "lean_beef", amount: 1.2 }, { id: "boiled_veg", amount: 1 }] },
    { id: "pork_rice_bowl", name: "Cơm thịt nạc & rau", description: "Bữa Việt đơn giản, tránh chọn ba chỉ.", items: [{ id: "rice", amount: 1 }, { id: "lean_pork", amount: 1.2 }, { id: "boiled_veg", amount: 1 }] },
    { id: "tofu_egg_rice", name: "Cơm đậu phụ, trứng & rau", description: "Phương án không cần thịt, protein vừa.", items: [{ id: "rice", amount: 0.8 }, { id: "tofu", amount: 1 }, { id: "boiled_egg", amount: 2 }, { id: "boiled_veg", amount: 1 }] },
    { id: "tuna_salad", name: "Salad cá ngừ & khoai", description: "Protein cao, calorie thấp hơn bữa cơm lớn.", items: [{ id: "tuna", amount: 1 }, { id: "salad", amount: 1 }, { id: "sweet_potato", amount: 0.7 }] },
    { id: "chicken_salad", name: "Ức gà & salad", description: "Dùng khi ngân sách calorie còn ít.", items: [{ id: "chicken_breast", amount: 1.5 }, { id: "salad", amount: 1 }] },
    { id: "eggs_oats_yogurt", name: "Trứng, yến mạch & sữa chua", description: "Bữa sáng nhanh, không cần món chế biến nhiều dầu.", items: [{ id: "boiled_egg", amount: 2 }, { id: "oats", amount: 1 }, { id: "plain_yogurt", amount: 1 }] },
    { id: "yogurt_whey_fruit", name: "Sữa chua, whey & chuối", description: "Bữa nhẹ giàu protein sau tập.", items: [{ id: "greek_yogurt", amount: 1 }, { id: "whey", amount: 1 }, { id: "banana", amount: 1 }] },
    { id: "shrimp_rice_bowl", name: "Cơm tôm & rau", description: "Protein cao với khẩu phần dễ ước tính.", items: [{ id: "rice", amount: 1 }, { id: "shrimp", amount: 1 }, { id: "boiled_veg", amount: 1 }] },
    { id: "pho_beef_meal", name: "Phở bò phần vừa", description: "Ăn ngoài được, nhưng khoảng sai số rộng.", items: [{ id: "pho_beef", amount: 1 }] },
    { id: "banh_mi_yogurt", name: "Bánh mì thịt & sữa chua", description: "Tiện khi ăn ngoài; không thêm nước ngọt.", items: [{ id: "banh_mi_meat", amount: 1 }, { id: "plain_yogurt", amount: 1 }] }
  ];

  window.ROOTBODY_FOOD_DATA = {
    foods,
    cookingMethods,
    mealTemplates,
    quickIds: ["rice", "milk_coffee", "boiled_egg", "fried_egg", "boiled_veg", "stir_veg", "lean_beef", "lean_pork", "chicken_breast", "tofu", "pho_beef", "banana"]
  };
})();


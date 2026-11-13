# Menu photo credits

Most dish photos on the menu are **stand-in photos from free-licence sources**, used for the 17 Nov 2026 class presentation with the Program Manager's approval. They are **not photographs of Menciu's Chopstix's own dishes** and are to be **replaced with the restaurant's own photos after the presentation**. The `C12` Beef Lo Mein photo, and the other nine photos added earlier (`A4`, `C6`, `C17`, `C19`, `C21`, `G5`, `G6`, `G11`, `R1`, `T3`), are the restaurant's own.

Each stand-in was cropped to 4:3 and resized. Licence names below are as published at the source page; CC BY and CC BY-SA require this credit. A cropped copy of a CC BY-SA photo stays under CC BY-SA.

| Code | Dish | Match | Author | Licence | Source |
|---|---|---|---|---|---|
| A1 | Chips (bag) | good | Doggo19292 | Public domain | https://commons.wikimedia.org/wiki/File:Cheese-flavored_Ruffles.jpg |
| A3 | Fried Chicken Wings | good | rawpixel (CC0 collection) | CC0 1.0 | https://www.rawpixel.com/image/5968196/cooking-chicken-wings |
| B1 | Soft Drink or Iced Tea | fair | ZooFari | Public domain | https://commons.wikimedia.org/wiki/File:Coca-Cola_can_top.jpg |
| C4 | Spicy Broccoli Chicken w/ Brown Sauce | fair | Paul Keller | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Sesame_chicken_wth_broccoli.jpg |
| C5 | Vegetable Noodle | good | Biswarup Ganguly | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Vegetable_Chow_Mein_-_Howrah_2014-03-23_9721.JPG |
| C7 | Kung Pao Chicken | good | Wheeler Cowperthwaite | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Kung_Pao_Chicken_1.jpg |
| C8 | Chicken with Cashew Nuts | good | Tamorlan | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Cashew_chicken_-_Pollo_con_anacardos.JPG |
| C11 | Chicken Lo Mein | good | Agthechef10403 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Orange_Chicken_and_Lo_mein.jpg |
| C12 | Beef Lo Mein | own | Menciu's Chopstix (supplied by Hiab) | Restaurant's own photo | restaurant (own photo) |
| C15 | Triple Delight | good | Ser Amantio di Nicolao | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Triple_Delight_from_Chef_Lin%27s_at_Tysons_Corner_Center.jpg |
| C18 | Shrimp with Vegetable | fair | Unknown authorUnknown author | Public domain | https://commons.wikimedia.org/wiki/File:USMC-090804-M-2664B-064.jpg |
| C20 | Mongolian Beef | fair | Craig Dugas from Bozeman, Montana, USA | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Mongolian_Beef_with_rice_and_noodles.jpg |
| G1 | Combination Plate | fair | Infrogmation | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Takeout_from_Green_Tea_Restaurant,_New_Orleans_-_5.jpg |
| G2 | Gen Joe's Chicken | good | 1700-talet | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:General_Tso%27s_Chicken.JPG |
| G3 | Moo Goo Gai Pan | good | Ser Amantio di Nicolao | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Plate_of_moo_goo_gai_pan.jpg |
| G4 | Sweet and Sour Chicken | good | Miansari66 | CC0 | https://commons.wikimedia.org/wiki/File:Sweet_and_Sour_Chicken.JPG |
| G9 | Vegetable Delight | fair | Dennis Sylvester Hurd | CC0 | https://commons.wikimedia.org/wiki/File:Chinese_stir_fry_noodles.jpg |
| R2 | Shrimp Fried Rice | good | Forssa01 | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Bowl_of_homemade_shrimp_fried_rice_-_Forsythe_0.jpg |
| R3 | Chicken Fried Rice | good | Andy Li | CC0 | https://commons.wikimedia.org/wiki/File:Chicken_fried_rice_-_Stir_Fry_by_CK_2023-12-02.jpg |
| R4 | Steamed Rice | good | TKdows 2026 | CC0 | https://commons.wikimedia.org/wiki/File:JP_%E6%97%A5%E6%9C%AC_Japan_%E4%BA%AC%E9%83%BD_Kyoto_%E5%9B%9B%E6%A2%9D_Shijo_side_Sukiya_Restaurant_food_cooked_steamed_white_rice_June_2026_N13P_03.jpg |
| R5 | Beef Fried Rice | fair | Fumikas Sagisavas | CC0 | https://commons.wikimedia.org/wiki/File:Cumin_beef_fried_rice.jpg |
| R6 | Vegetable Fried Rice | fair | Vyacheslav Argenberg | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Malapascua,_Vegetable_fried_rice,_Philippines.jpg |
| S1 | Hot and Sour Soup | good | jeffreyw | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Mmm..._hot_and_sour_soup_(7218396478).jpg |
| S2 | Egg Drop Soup | good | Masahiko OHKUBO from Kobe, Japan | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Egg_drop_soup_(1).jpg |
| S3 | Chicken Soup | fair | Judgefloro | CC0 | https://commons.wikimedia.org/wiki/File:3133Campbell%27s_Chicken_Noodle_Soup_with_Chayote_and_Potatoes_01.jpg |

## Items with no photo yet

A2 Egg Roll, C1, C2, C3, C9, C10, C13, C14, C16 (the entrees served with rice have no free photo that shows rice), G10, T1 and T2 keep the placeholder tile until the restaurant supplies photos.

## To replace a photo

1. Save the new 4:3 JPEG (under 300 KB) as `public/menu/<code>.jpg`.
2. Delete that row from this file.
3. `node --test tests/menu-photos.test.mjs` checks that every registered code has a file and every file is registered.

// Static reference data: Kenya's 47 counties with representative sub-county
// (constituency-level) breakdowns. Used by the signup wizard's County -> Sub-County
// cascading select, and by the tenant/championship forms. No DB table backs this —
// county/subcounty are stored as plain strings on Tenant/Championship.

export interface KenyaCounty {
  name: string;
  subcounties: string[];
}

export const KENYA_COUNTIES: KenyaCounty[] = [
  { name: "Mombasa", subcounties: ["Changamwe", "Jomvu", "Kisauni", "Nyali", "Likoni", "Mvita"] },
  { name: "Kwale", subcounties: ["Msambweni", "Lunga Lunga", "Matuga", "Kinango"] },
  { name: "Kilifi", subcounties: ["Kilifi North", "Kilifi South", "Kaloleni", "Rabai", "Ganze", "Malindi", "Magarini"] },
  { name: "Tana River", subcounties: ["Garsen", "Galole", "Bura"] },
  { name: "Lamu", subcounties: ["Lamu East", "Lamu West"] },
  { name: "Taita Taveta", subcounties: ["Taveta", "Wundanyi", "Mwatate", "Voi"] },
  { name: "Garissa", subcounties: ["Garissa Township", "Balambala", "Lagdera", "Dadaab", "Fafi", "Ijara"] },
  { name: "Wajir", subcounties: ["Wajir North", "Wajir East", "Tarbaj", "Wajir West", "Eldas", "Wajir South"] },
  { name: "Mandera", subcounties: ["Mandera West", "Banissa", "Mandera North", "Mandera South", "Mandera East", "Lafey"] },
  { name: "Marsabit", subcounties: ["Moyale", "North Horr", "Saku", "Laisamis"] },
  { name: "Isiolo", subcounties: ["Isiolo North", "Isiolo South"] },
  { name: "Meru", subcounties: ["Igembe South", "Igembe Central", "Igembe North", "Tigania West", "Tigania East", "North Imenti", "Buuri", "Central Imenti", "South Imenti"] },
  { name: "Tharaka-Nithi", subcounties: ["Maara", "Chuka/Igambang'ombe", "Tharaka"] },
  { name: "Embu", subcounties: ["Manyatta", "Runyenjes", "Mbeere South", "Mbeere North"] },
  { name: "Kitui", subcounties: ["Mwingi North", "Mwingi West", "Mwingi Central", "Kitui West", "Kitui Rural", "Kitui Central", "Kitui East", "Kitui South"] },
  { name: "Machakos", subcounties: ["Masinga", "Yatta", "Kangundo", "Matungulu", "Kathiani", "Mavoko", "Machakos Town", "Mwala"] },
  { name: "Makueni", subcounties: ["Mbooni", "Kilome", "Kaiti", "Kibwezi West", "Kibwezi East", "Makueni", "Kilungu"] },
  { name: "Nyandarua", subcounties: ["Kinangop", "Kipipiri", "Ol Kalou", "Ol Jorok", "Ndaragwa"] },
  { name: "Nyeri", subcounties: ["Tetu", "Kieni", "Mathira", "Othaya", "Mukurweini", "Nyeri Town"] },
  { name: "Kirinyaga", subcounties: ["Mwea", "Gichugu", "Ndia", "Kirinyaga Central"] },
  { name: "Murang'a", subcounties: ["Kangema", "Mathioya", "Kiharu", "Kigumo", "Maragua", "Kandara", "Gatanga"] },
  { name: "Kiambu", subcounties: ["Gatundu South", "Gatundu North", "Juja", "Thika Town", "Ruiru", "Githunguri", "Kiambu", "Kiambaa", "Kabete", "Kikuyu", "Limuru", "Lari"] },
  { name: "Turkana", subcounties: ["Turkana North", "Turkana West", "Turkana Central", "Loima", "Turkana South", "Turkana East"] },
  { name: "West Pokot", subcounties: ["Kapenguria", "Sigor", "Kacheliba", "Pokot South"] },
  { name: "Samburu", subcounties: ["Samburu West", "Samburu North", "Samburu East"] },
  { name: "Trans Nzoia", subcounties: ["Kwanza", "Endebess", "Saboti", "Kiminini", "Cherangany"] },
  { name: "Uasin Gishu", subcounties: ["Soy", "Turbo", "Moiben", "Ainabkoi", "Kapseret", "Kesses"] },
  { name: "Elgeyo-Marakwet", subcounties: ["Marakwet East", "Marakwet West", "Keiyo North", "Keiyo South"] },
  { name: "Nandi", subcounties: ["Tinderet", "Aldai", "Nandi Hills", "Chesumei", "Emgwen", "Mosop"] },
  { name: "Baringo", subcounties: ["Tiaty", "Baringo North", "Baringo Central", "Baringo South", "Mogotio", "Eldama Ravine"] },
  { name: "Laikipia", subcounties: ["Laikipia West", "Laikipia East", "Laikipia North"] },
  { name: "Nakuru", subcounties: ["Molo", "Njoro", "Naivasha", "Gilgil", "Kuresoi South", "Kuresoi North", "Subukia", "Rongai", "Bahati", "Nakuru Town West", "Nakuru Town East"] },
  { name: "Narok", subcounties: ["Kilgoris", "Emurua Dikirr", "Narok North", "Narok East", "Narok South", "Narok West"] },
  { name: "Kajiado", subcounties: ["Kajiado North", "Kajiado Central", "Kajiado East", "Kajiado West", "Kajiado South"] },
  { name: "Kericho", subcounties: ["Ainamoi", "Belgut", "Bureti", "Kipkelion East", "Kipkelion West", "Soin/Sigowet"] },
  { name: "Bomet", subcounties: ["Sotik", "Chepalungu", "Bomet East", "Bomet Central", "Konoin"] },
  { name: "Kakamega", subcounties: ["Lugari", "Likuyani", "Malava", "Lurambi", "Navakholo", "Mumias West", "Mumias East", "Matungu", "Butere", "Khwisero", "Shinyalu", "Ikolomani"] },
  { name: "Vihiga", subcounties: ["Vihiga", "Sabatia", "Hamisi", "Luanda", "Emuhaya"] },
  { name: "Bungoma", subcounties: ["Mt Elgon", "Sirisia", "Kabuchai", "Bumula", "Kanduyi", "Webuye East", "Webuye West", "Kimilili", "Tongaren"] },
  { name: "Busia", subcounties: ["Teso North", "Teso South", "Nambale", "Matayos", "Butula", "Funyula", "Budalangi"] },
  { name: "Siaya", subcounties: ["Ugenya", "Ugunja", "Alego Usonga", "Gem", "Bondo", "Rarieda"] },
  { name: "Kisumu", subcounties: ["Kisumu East", "Kisumu West", "Kisumu Central", "Seme", "Nyando", "Muhoroni", "Nyakach"] },
  { name: "Homa Bay", subcounties: ["Kasipul", "Kabondo Kasipul", "Karachuonyo", "Rangwe", "Homa Bay Town", "Ndhiwa", "Suba North", "Suba South"] },
  { name: "Migori", subcounties: ["Rongo", "Awendo", "Suna East", "Suna West", "Uriri", "Nyatike", "Kuria West", "Kuria East"] },
  { name: "Kisii", subcounties: ["Bonchari", "South Mugirango", "Bomachoge Borabu", "Bobasi", "Bomachoge Chache", "Nyaribari Masaba", "Nyaribari Chache", "Kitutu Chache North", "Kitutu Chache South"] },
  { name: "Nyamira", subcounties: ["Kitutu Masaba", "West Mugirango", "North Mugirango", "Borabu"] },
  { name: "Nairobi", subcounties: ["Westlands", "Dagoretti North", "Dagoretti South", "Langata", "Kibra", "Roysambu", "Kasarani", "Ruaraka", "Embakasi South", "Embakasi North", "Embakasi Central", "Embakasi East", "Embakasi West", "Makadara", "Kamukunji", "Starehe", "Mathare"] },
];

export function getSubcounties(countyName: string): string[] {
  return KENYA_COUNTIES.find((c) => c.name === countyName)?.subcounties ?? [];
}

# EAS Build คู่มือการสร้าง CalendarVee

คู่มือนี้จะช่วยให้คุณสร้าง CalendarVee (Expo React Native app) โดยใช้ EAS Build บน Expo cloud servers เพื่อไม่ต้องเปิด `npx expo start` บนคอมพิวเตอร์ของคุณตลอดเวลา

---

## ขั้นตอนที่ 1: ติดตั้ง EAS CLI

### 1.1 ติดตั้ง EAS CLI ผ่าน npm

```bash
npm install -g eas-cli
```

### 1.2 สร้างบัญชี Expo Account

ถ้าคุณยังไม่มี Expo account ให้:
- ไปที่ https://expo.dev
- คลิก "Sign up"
- สร้างบัญชี (เก็บ email และ password ไว้)

### 1.3 เข้าสู่ระบบด้วย EAS CLI

```bash
eas login
```

ใส่ email และ password ที่สร้างไว้ใน Expo

### 1.4 ตรวจสอบการเข้าสู่ระบบ

```bash
eas whoami
```

ควรแสดง username ของคุณ

---

## ขั้นตอนที่ 2: เชื่อมต่อ Project CalendarVee กับ EAS

### 2.1 ไปที่ folder CalendarVee

```bash
cd "C:\Users\vee\Desktop\Calendar_Vee\CalendarVee"
```

### 2.2 เชื่อมต่อกับ Expo Project

```bash
eas init
```

ระบบจะถามว่า:
- "What would you like to do?" → เลือก "Create a new project" (หรือ "Link existing project" ถ้ามีแล้ว)
- ใส่ชื่อ project: `CalendarVee` (หรือชื่ออื่นที่คุณต้องการ)

### 2.3 ตรวจสอบ eas.json

หลังจากรัน `eas init` ระบบจะสร้างไฟล์ `eas.json` ลงในโฟลเดอร์

ตัวอย่าง eas.json ของคุณ:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## ขั้นตอนที่ 3: Build APK สำหรับ Android

### 3.1 คำอธิบาย Build Profiles

ใน `eas.json` มี 3 profile หลัก:

| Profile | ใช้สำหรับ | คุณสมบัติ |
|---------|----------|---------|
| **development** | การพัฒนา + Expo Go | ติดตั้ง Expo Go app แล้วเชื่อมต่อ |
| **preview** | การทดสอบ QA | APK ที่สมบูรณ์ สำหรับทดสอบจริง |
| **production** | ปล่อยตัว (Release) | APK ที่สมบูรณ์พร้อมส่ง App Store |

### 3.2 Build APK สำหรับทดสอบ (Preview)

```bash
eas build --platform android --profile preview
```

ระบบจะ:
1. อัปโหลดโค้ดไปยัง Expo servers
2. สร้าง APK บน cloud
3. แสดง build ID และ URL download

**เวลาที่ใช้**: 10-20 นาที

### 3.3 Build APK สำหรับปล่อยตัว (Production)

```bash
eas build --platform android --profile production
```

ใช้คำสั่งเดียวกัน แต่ใช้ production profile แทน

### 3.4 ดูรายการ Build ที่สร้างแล้ว

```bash
eas build:list
```

จะแสดงรายการ build ทั้งหมด พร้อม URL สำหรับดาวน์โหลด

---

## ขั้นตอนที่ 4: ดาวน์โหลดและติดตั้ง APK

### 4.1 วิธีที่ 1: ดาวน์โหลดจาก Terminal

หลังจากรัน `eas build` ระบบจะแสดงข้อความ:

```
✓ Build finished!
APK: https://builds.expo.dev/builds/xxxxxxx
```

คัดลอก URL นี้ไปบราวเซอร์ และดาวน์โหลด APK

### 4.2 วิธีที่ 2: ดาวน์โหลดจาก Expo Dashboard

1. ไปที่ https://expo.dev
2. เข้าสู่ระบบด้วย account ของคุณ
3. คลิก project "CalendarVee"
4. ไปที่แท็บ "Builds"
5. คลิก build ล่าสุด
6. คลิก "Download" เพื่อดาวน์โหลด APK

### 4.3 วิธีที่ 3: ใช้ QR Code

ใน Expo Dashboard ที่หน้า build มี QR code ที่สามารถสแกนด้วยโทรศัพท์ Android เพื่อดาวน์โหลด APK โดยตรง

### 4.4 ติดตั้ง APK บนโทรศัพท์

**วิธีที่ 1: ผ่าน Email หรือ Drive**
1. ส่ง APK ไปที่ email ของคุณ
2. เปิด email บนโทรศัพท์
3. ดาวน์โหลด APK
4. ติดตั้ง

**วิธีที่ 2: ผ่าน USB Cable**
1. เชื่อม USB จากคอมพิวเตอร์ไปโทรศัพท์
2. ลาก APK เข้าไปในโทรศัพท์
3. เปิด File Manager บนโทรศัพท์ → เจอไฟล์ APK
4. แตะ APK เพื่อติดตั้ง

**ถ้า Android บอก "ไม่อนุญาตให้ติดตั้งจากแหล่งที่มาไม่ทราบ":**
- ไปที่ Settings → Security
- เปิด "Unknown Sources" (หรือ "Install unknown apps")
- ลองติดตั้งใหม่

---

## ขั้นตอนที่ 5: OTA Update (อัปเดตโดยไม่ต้อง Build APK ใหม่)

### 5.1 คืออะไร OTA (Over-The-Air) Update?

OTA Update ช่วยให้คุณอัปเดตโค้ด JavaScript เท่านั้น **โดยไม่ต้อง build APK ใหม่**

- ใช้เวลา 1-3 นาที แทน 10-20 นาที
- ผู้ใช้เห็นอัปเดตได้เลย

**เมื่อไหร่ไม่ต้องใช้ OTA:**
- เปลี่ยนแปลง native code
- เพิ่ม/ลบ native library
- เปลี่ยน app.json อย่างหนัก

**เมื่อไหร่ใช้ OTA:**
- แก้ bug UI
- เปลี่ยน text หรือ color
- เปลี่ยนฟังก์ชัน JavaScript

### 5.2 ทำ OTA Update

```bash
eas update --branch preview --message "แก้ไข bug หน้าแรก"
```

ระบบจะ:
1. อัปเดต code บน Expo servers
2. ส่งให้ผู้ใช้ app ที่เปิดอยู่ทันที

### 5.3 ดูรายการ OTA Updates

```bash
eas update:list
```

---

## ขั้นตอนที่ 6: สรุปคำสั่งที่ใช้บ่อย

### เชื่อมต่อและตั้งค่า

```bash
# ติดตั้ง EAS CLI
npm install -g eas-cli

# เข้าสู่ระบบ
eas login

# ตรวจสอบบัญชี
eas whoami

# เชื่อมต่อ project
eas init
```

### Build APK

```bash
# Build สำหรับทดสอบ
eas build --platform android --profile preview

# Build สำหรับปล่อยตัว
eas build --platform android --profile production

# ดูรายการ build
eas build:list
```

### OTA Update

```bash
# อัปเดต JavaScript code
eas update --branch preview --message "ข้อความอัปเดต"

# ดูรายการ update
eas update:list
```

---

## ขั้นตอนที่ 7: FAQ และแก้ปัญหา

### ปัญหา: "eas command not found"

**สาเหตุ:** ไม่ได้ติดตั้ง EAS CLI หรือระบบไม่เห็น

**วิธีแก้:**
```bash
npm install -g eas-cli
```

ถ้าบน macOS/Linux ต้องใช้ sudo:
```bash
sudo npm install -g eas-cli
```

---

### ปัญหา: "Not authenticated. Please sign in with eas-cli"

**สาเหตุ:** ยังไม่ได้เข้าสู่ระบบ

**วิธีแก้:**
```bash
eas login
```

ตรวจสอบ:
```bash
eas whoami
```

---

### ปัญหา: "Failed to create build"

**สาเหตุ:** มักเป็นเพราะ:
1. package.json มี error
2. native dependencies ขัดแย้ง
3. ความสิ้นสุดของ Free Tier (30 builds/month)

**วิธีแก้:**
```bash
# ตรวจสอบ package.json
npm install

# Build test ที่ simple
eas build --platform android --profile preview
```

---

### ปัญหา: "APK ติดตั้งไม่ได้บน Android"

**สาเหตุ:** Android version ที่ต่ำเกินไป หรือมี app version conflict

**วิธีแก้:**
1. ถอน app เดิมออก
2. รีบูต โทรศัพท์
3. ติดตั้ง APK ใหม่

หรือปรับ app.json:
```json
"android": {
  "minSdkVersion": 24,
  "targetSdkVersion": 34
}
```

---

### ปัญหา: "Build ใช้เวลานาน"

**ปกติ:** 10-20 นาทีครั้งแรก, 5-10 นาทีครั้งต่อไป

**ถ้านานกว่า 30 นาที:**
1. ตรวจสอบเน็ต
2. ลองใหม่: `eas build --platform android --profile preview`

---

### ปัญหา: หมด Free Tier (30 builds/month)

**ตัวเลือก:**
1. รอเดือนต่อไป (reset อัตโนมัติ)
2. อัปเกรด Expo account เป็น Pro/Premium
3. ใช้ `eas update` แทน build ใหม่สำหรับการอัปเดต

---

### ปัญหา: Build settings คืออะไร?

**ในไฟล์ eas.json:**

```json
"preview": {
  "android": {
    "buildType": "apk"
  }
}
```

- `buildType: "apk"` → สร้าง APK (ติดตั้งง่าย)
- `buildType: "aab"` → Android App Bundle (เฉพาะ Google Play)

---

## ขั้นตอนที่ 8: Workflow ประจำวัน

### สำหรับการพัฒนา

1. **ทำให้ code เสร็จ** บนคอมพิวเตอร์
2. **Push ไป git** (optional แต่แนะนำ)
3. **ทดสอบด้วย OTA:**
   ```bash
   eas update --branch preview --message "ทดสอบ feature X"
   ```
4. **รอ 1-3 นาที** ให้ผู้ใช้ get update
5. **ทดสอบบน app** ของจริง

### เมื่อจะปล่อยตัว

1. **ตรวจสอบ app.json** ว่า version ถูก
2. **Build APK ใหม่:**
   ```bash
   eas build --platform android --profile production
   ```
3. **ทดสอบ production APK** ก่อนส่ง
4. **อัปโหลด Google Play** (ถ้าต้องการ)

---

## ขั้นตอนที่ 9: ข้อมูลโครงการของคุณ

```
Project Name:     CalendarVee
Slug:             calendar-vee
Android Package:  com.vee.calendar
iOS Bundle:       com.vee.calendar
Location:         C:\Users\vee\Desktop\Calendar_Vee\CalendarVee
Expo Account:     [username ของคุณ]
```

ตรวจสอบให้แน่ใจว่า package names ถูกต้องใน app.json:

```json
{
  "name": "CalendarVee",
  "slug": "calendar-vee",
  "android": {
    "package": "com.vee.calendar"
  },
  "ios": {
    "bundleIdentifier": "com.vee.calendar"
  }
}
```

---

## ขั้นตอนที่ 10: ลิงก์ที่มีประโยชน์

- **Expo Dashboard:** https://expo.dev
- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **EAS Update Docs:** https://docs.expo.dev/eas-update/introduction/
- **Expo CLI Docs:** https://docs.expo.dev/get-started/installation/

---

## บันทึกเพิ่มเติม

### ความแตกต่าง Build vs Update

| สิ่ง | Build | Update |
|-----|-------|--------|
| **จุดประสงค์** | สร้าง APK/IPA ใหม่ | อัปเดต JS code |
| **เวลา** | 10-20 นาที | 1-3 นาที |
| **ต้องใช้ APK ใหม่** | ใช่ | ไม่ต้อง |
| **ใช้เมื่อ** | native code เปลี่ยน | JS logic เปลี่ยน |

### Free Tier Limits

- **30 builds/month** (preview + production รวม)
- **Unlimited OTA updates**
- **1 GB storage** สำหรับ builds

---

## ติดต่อ

ถ้ามีปัญหา:
- ตรวจสอบ Expo Docs: https://docs.expo.dev
- ถามใน Expo Forums: https://forums.expo.dev
- ดูตัวอย่าง: https://github.com/expo/expo/tree/main/samples

---

**อัปเดตครั้งล่าสุด:** 2026-04-05
**สำหรับ:** CalendarVee v1.0
**EAS CLI version:** 5.0.0 ขึ้นไป

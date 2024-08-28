import requests, re, colorama
from requests.structures import CaseInsensitiveDict
import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
#🇦🇷🇦🇷Messi is your uncle 💙♥
colorama.init()
#@oliviaoriu
url = "http://www.insecam.org/en/jsoncountries/"

headers = CaseInsensitiveDict()
headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
headers["Cache-Control"] = "max-age=0"
headers["Connection"] = "keep-alive"
headers["Host"] = "www.insecam.org"
headers["Upgrade-Insecure-Requests"] = "1"
headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"

resp = requests.get(url, headers=headers)
data = resp.json()
countries = data['countries']

bot = telebot.TeleBot('7264213709:AAEHqc9rpM4wqMjc8I5yJPuc5_60u7UlwVg') #هنا خلي توكن بين ال""

@bot.message_handler(commands=['start'])
def start(message):
    resp_markup = InlineKeyboardMarkup(row_width=1)
    for key, value in countries.items():
        resp_markup.add(InlineKeyboardButton(text=f'Code: ({key}) - {value["country"]} / ({value["count"]})', callback_data=key))
    bot.send_message(message.chat.id, 'اختر الدولة:', reply_markup=resp_markup)

@bot.callback_query_handler(func=lambda call: True)
def callback_handler(call):
    try:
        country = call.data
        res = requests.get(
            f"http://www.insecam.org/en/bycountry/{country}", headers=headers
        )
        last_page = re.findall(r'pagenavigator\("\?page=", (\d+)', res.text)[0]

        for page in range(int(last_page)):
            res = requests.get(
                f"http://www.insecam.org/en/bycountry/{country}/?page={page}",
                headers=headers
            )
            find_ip = re.findall(r"http://\d+.\d+.\d+.\d+:\d+", res.text)

            with open(f'{country}.txt', 'w') as f:
                for ip in find_ip:
                    f.write(f'{ip}\n')
        
        bot.send_document(call.message.chat.id, open(f'{country}.txt', 'rb'))
    except:
        bot.send_message(call.message.chat.id, 'حدث خطاء.')

bot.polling()

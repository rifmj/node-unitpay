var path = require('path');
var express = require('express');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Helpers = require('../helpers')

var app = express();

// Соединение с базой данных
mongoose.connect('');

var server = app.listen(1337);

// Определяем модель для платежа

var paymentSchema = new Schema({
    unitpayId: String,
    account: String,
    sum: Number,
    itemsCount: Number,
    dateCreate: { type: Date, default: Date.now },
    dateComplete: Date,
    status: {type: Number, default: 0}
});

paymentSchema.statics.createPayment = function (params, callback) {
    new Payment(params).save(callback);
}

paymentSchema.statics.getPaymentByUnitpayId = function (unitpayId, callback) {
    this.findOne({unitpayId: unitpayId}, callback);
}

paymentSchema.statics.confirmPaymentByUnitpayId = function (params, callback) {
    this.update(params, {status: 1, dateComplete: Date.now()}, callback);
}

var Payment = mongoose.model('Payment', paymentSchema);

app.get('/payment', function (req, res) {

    // Ваш секретный ключ (из настроек проекта в личном кабинете unitpay.ru )
    var SECRET_KEY = '';
    // Стоимость товара в руб.
    var ITEM_PRICE = 10;

    // Получаем параметры GET-запроса
    var request = req.query;

    if (Helpers.empty(request) || Helpers.empty(request.params) || !Helpers.is_array(request.params)) {
        return getResponseError('Некорректный запрос');
    }

    var method = request.method;
    var params = request.params;

    if (params.sign != getMd5Sign(params, SECRET_KEY)) {
        return getResponseError('Некорректная цифровая подпись');
    }

    if (method == 'check') {

        if (Payment.getPaymentByUnitpayId(params.unitpayId)) {
            return getResponseSuccess('OK');
        }

        itemsCount = Math.floor(params.sum / ITEM_PRICE);

        if (itemsCount <= 0) {
            return getResponseError('Суммы ' + params.sum + ' руб. не достаточно для оплаты товара ' +
                'стоимостью ' + ITEM_PRICE + ' руб.');
        }

        Payment.createPayment({
            unitpayId: params.unitpayId,
            account: params.account,
            sum: params.sum,
            itemsCount: params.itemsCount
        }, function (err, result) {
            if (err) return getResponseError('Не удается создать платеж в БД');
        });

        checkResult = check(params);
        if (checkResult !== true) {
            return getResponseError($checkResult);
        }
    }

    if (method == 'pay') {

        payment = Payment.getPaymentByUnitpayId(params.unitpayId, function (err, result) {
            if (!err) return true;
        });

        if (payment && payment.status == 1) {
            return getResponseSuccess('OK');
        }

        Payment.confirmPaymentByUnitpayId({unitpayId: params.unitpayId}, function (err, result) {
            if (err) return getResponseError('Не удается подтвердить платеж в БД');
        });
    }

    return getResponseSuccess('OK');

    // Успешное завершение
    function getResponseSuccess(message) {
        res.send(
            {
                result: {
                    message: message
                }
            }
        );
    }

    // Ошибка запроса
    function getResponseError(message) {
        res.send(
            {
                error: {
                    code: -32000,
                    message: message
                }
            }
        );
    }

    // Генерация цифровой подписи
    function getMd5Sign(params, secretKey) {
        var array = new Array();
        for (var property in Helpers.ksort(params)) {
            if (property != 'sign') {
                array.push(params[property]);
            }
        }
        return Helpers.md5(array.join('') + SECRET_KEY);
    }

    function check(params) {
        /**
         * Проверка условий перед оплатой (например проверка заказа)
         *
         * return true; - Всё отлично, можно оплатить заказ
         * return 'Текст ошибки'; - Вернуть ошибку и завершить платеж
         *
         * Описание переменной params
         *
         * params.phone
         * Десятизначный телефон плательщика (например, 9155743552).
         *
         * params.account
         * Идентификатор абонента в системе партнера (например логин или email абонента).
         *
         * params.sum
         * Сумма платежа (например, 10.00).
         */
        return true;
    }

    function pay(params) {
        /**
         * Событие происходит сразу после успешной оплаты.
         * На этой стадии необходимо предоставить услугу/товар абоненту.
         *
         * Описание переменной params
         *
         * params.unitpayId
         * Внутренний номер платежа в Unitpay.
         * Очень важно! В системе партнера не должно быть двух разных платежей с одним unitpayId.
         *
         * params.account
         * Идентификатор абонента в системе партнера (например логин или email абонента)
         *
         * params.sum
         * Сумма платежа (например, 10.00).
         *
         * params.phone
         * Десятизначный телефон плательщика (например, 9155743552).
         *
         * params.paymentType
         * Тип оплаты (sms — СМС Биллинг, mc — Мобильная коммерция)
         *
         * params.operator
         * Буквенный код оператора.
         *
         * params.date
         * Дата платежа в формате YYYY-mm-dd HH:ii:ss.
         *
         * params.sign
         * Цифровая подпись, образуется как md5 хеш от склеивания всех значений параметров (кроме sign),
         * отсортированных по алфавиту и секретного ключа 9d689864e8c34e077e2a4825d8d71a70
         */
        return true;
    }
});
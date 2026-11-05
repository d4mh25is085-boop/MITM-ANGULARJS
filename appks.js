var app = angular.module("myApp", []);

app.controller("myCtrl", function($scope) {

    $scope.today = new Date();

    $scope.products = [
        { name: "Laptop", price: 50000 },
        { name: "Mobile", price: 20000 },
        { name: "Tablet", price: 1000 }
    ];

});
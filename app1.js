var app = angular.module('myApp', []);

//parent controller

app.controller('CollegeController', function($scope) {
    $scope.collegeName = "abc college";
});

//child controller

app.controller(
    "StudentController", function($scope) {
        $scope.name = "john";
        $scope.department = "Computer Science";
    }
);
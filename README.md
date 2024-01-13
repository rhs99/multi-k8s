### multi-k8s

Locally test with minikube like below
```
minikube start
minikube addons enable ingress
kubectl apply -f k8s
```
Then go to `minikube ip` in the browser